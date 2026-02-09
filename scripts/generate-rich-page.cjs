/**
 * 노션 컨텐츠를 리치 UI Astro 페이지로 변환
 * - 스마트 패턴 인식으로 자동 구조화
 * - 키워드 의존 최소화, 구조 기반 분석
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const PAGES_DIR = path.join(process.cwd(), 'src/pages');
const RICH_PAGES_JSON = path.join(process.cwd(), 'src/data/rich-pages.json');

// ============================================================
// 스마트 패턴 인식 유틸리티
// ============================================================

// 긍정적 키워드 (장점 판별)
const POSITIVE_KEYWORDS = [
  '좋', '뛰어나', '우수', '빠른', '빠르', '강력', '훌륭', '최고', '최상',
  '높은', '넓은', '가벼', '편리', '쉬운', '부드러', '선명', '깔끔',
  '저렴', '가성비', '효율', '안정', '조용', '쿨링', '오래', '내구',
  '견고', '튼튼', '정확', '밝은', '세련', '프리미엄', '고급', '쾌적',
  '풍부', '지원', '탑재', '만족', '충분', '넉넉', '탁월', '우월'
];

// 부정적 키워드 (단점 판별)
const NEGATIVE_KEYWORDS = [
  '아쉬', '부족', '느린', '느리', '비싼', '비싸', '무거', '불편',
  '어려', '시끄러', '발열', '뜨거', '약한', '좁은', '낮은', '짧은',
  '제한', '단점', '아쉬움', '불안정', '번거로', '부담', '소음',
  '한계', '미흡', '없는', '없음', '못하', '못한', '필요', '별도'
];

// 스펙 키워드
const SPEC_KEYWORDS = [
  'cpu', 'gpu', 'ram', 'ssd', 'hdd', '프로세서', '그래픽', '메모리',
  '저장', '디스플레이', '화면', '배터리', '무게', '크기', '해상도',
  '주사율', 'hz', '인치', 'gb', 'tb', 'w', 'wh'
];

// 구매 링크 도메인
const BUY_LINK_DOMAINS = [
  'coupang.com', 'link.coupang.com', '11st.co.kr', 'gmarket.co.kr',
  'auction.co.kr', 'danawa.com', 'smartstore.naver.com', 'amazon'
];

// 텍스트가 긍정적인지 판별
function isPositiveText(text) {
  const lower = text.toLowerCase();
  return POSITIVE_KEYWORDS.some(kw => lower.includes(kw));
}

// 텍스트가 부정적인지 판별
function isNegativeText(text) {
  const lower = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
}

// 텍스트가 스펙 형태인지 판별 (key: value)
function isSpecFormat(text) {
  const colonIdx = text.indexOf(':');
  if (colonIdx < 1 || colonIdx > 20) return false;
  const key = text.substring(0, colonIdx).toLowerCase();
  return SPEC_KEYWORDS.some(kw => key.includes(kw)) || colonIdx < 15;
}

// 구매 링크인지 판별
function isBuyLink(url) {
  if (!url) return false;
  return BUY_LINK_DOMAINS.some(domain => url.includes(domain));
}

// 유사도 점수 계산 (공통 단어 수) — 제품 매칭에 사용
function getSimilarityScore(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  let score = 0;
  for (const w1 of words1) {
    if (w1.length < 2) continue;
    for (const w2 of words2) {
      if (w2.includes(w1) || w1.includes(w2)) score++;
    }
  }
  return score;
}

// 제품명 정규화 (비교용)
function normalizeProductName(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// 중복 제품 병합: 같은 이름의 제품 엔트리를 하나로 합침
function deduplicateProducts(products) {
  const merged = [];
  const used = new Set();

  for (let i = 0; i < products.length; i++) {
    if (used.has(i)) continue;

    let base = { ...products[i] };

    for (let j = i + 1; j < products.length; j++) {
      if (used.has(j)) continue;

      const other = products[j];
      // 정확히 같은 이름만 병합 (유사도 기반 병합은 다른 모델을 합칠 위험)
      const nameMatch = normalizeProductName(base.name) === normalizeProductName(other.name);

      if (nameMatch) {
        // 비어있지 않은 값을 우선 사용하여 병합
        base = {
          ...base,
          summary: base.summary || other.summary,
          keyPoint: base.keyPoint || other.keyPoint,
          target: base.target || other.target,
          buyUrl: base.buyUrl || other.buyUrl,
          description: base.description || other.description,
          specs: base.specs.length > 0 ? base.specs : other.specs,
          pros: base.pros.length > 0 ? base.pros : other.pros,
          cons: base.cons.length > 0 ? base.cons : other.cons,
          recommendFor: base.recommendFor.length > 0 ? base.recommendFor : other.recommendFor,
        };
        used.add(j);
      }
    }

    merged.push(base);
  }

  // ID 재정렬
  merged.forEach((p, idx) => { p.id = idx + 1; });

  return merged;
}

// 테이블이 요약 테이블인지 판별 (첫 번째 헤더가 제품 식별자 + 평가 항목 존재)
function isSummaryTable(headers) {
  if (headers.length < 2) return false;
  const firstHeader = (headers[0] || '').toLowerCase();
  const summaryFirstCol = ['제품', '이름', '모델', '상품', '순위'];
  const hasSummaryFirstCol = summaryFirstCol.some(kw => firstHeader.includes(kw));
  const evalKeywords = ['핵심', '한 줄', '추천', '평가', '요약', '장점', '특징', '코멘트', '대상'];
  const hasEvalCol = headers.slice(1).some(h => evalKeywords.some(kw => h.toLowerCase().includes(kw)));
  return hasSummaryFirstCol && hasEvalCol;
}

// 롱테일 키워드 매칭 패턴 (우선순위 순)
const SECTION_PATTERNS = [
  // FAQ
  { pattern: '자주 묻는 질문', type: 'faq' },
  { pattern: 'q&a', type: 'faq' },
  { pattern: 'faq', type: 'faq' },

  // 마무리
  { pattern: '이 글을 마치며', type: 'closing' },
  { pattern: '마무리', type: 'closing' },
  { pattern: '결론', type: 'closing' },
  { pattern: '정리하며', type: 'closing' },

  // 요약
  { pattern: '핵심만 콕', type: 'summary' },
  { pattern: '한눈에 보기', type: 'summary' },
  { pattern: '핵심 요약', type: 'summary' },

  // 도입
  { pattern: '들어가며', type: 'topic' },

  // 비교
  { pattern: '제품 비교표', type: 'comparison' },
  { pattern: '제품 비교', type: 'comparison' },
  { pattern: '비교표', type: 'comparison' },

  // 선택 가이드
  { pattern: '어떤 제품을 선택해야', type: 'guide' },
  { pattern: '구매 가이드', type: 'guide' },
  { pattern: '선택 가이드', type: 'guide' },
  { pattern: '선택해야 할까', type: 'guide' },

  // 제품 설명 섹션 헤더 (제품 이름이 아님!)
  { pattern: '제품 설명', type: 'products' },
  { pattern: '제품 리뷰', type: 'products' },
  { pattern: '제품 소개', type: 'products' },
];

// h2 제목으로 섹션 타입 추론
function inferSectionType(title) {
  const t = title.toLowerCase().trim();

  // 롱테일 패턴 매칭 (숏 키워드 폴백 없음 — 롱테일 강제 정책)
  for (const { pattern, type } of SECTION_PATTERNS) {
    if (t.includes(pattern)) {
      return type;
    }
  }

  // 매칭 실패 → null (제품명으로 처리)
  return null;
}

// 리치 페이지 메타데이터 저장/업데이트
function updateRichPagesRegistry(pageData) {
  let registry = [];

  if (fs.existsSync(RICH_PAGES_JSON)) {
    try {
      registry = JSON.parse(fs.readFileSync(RICH_PAGES_JSON, 'utf-8'));
    } catch (e) {
      registry = [];
    }
  }

  // notionPageId로 기존 항목 찾기
  let existingIndex = registry.findIndex(p => p.notionPageId === pageData.notionPageId);

  // 못 찾으면 slug로 찾기 (기존 데이터 호환)
  if (existingIndex < 0) {
    existingIndex = registry.findIndex(p => p.slug === pageData.slug && !p.notionPageId);
  }

  // 그래도 못 찾으면 같은 slug가 있는지 확인 (중복 방지)
  if (existingIndex < 0) {
    existingIndex = registry.findIndex(p => p.slug === pageData.slug);
  }

  if (existingIndex >= 0) {
    registry[existingIndex] = pageData;
    console.log(`   ♻️  Updated existing entry: ${pageData.slug}`);
  } else {
    registry.push(pageData);
    console.log(`   ➕ Added new entry: ${pageData.slug}`);
  }

  // 날짜순 정렬 (최신순)
  registry.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(RICH_PAGES_JSON, JSON.stringify(registry, null, 2), 'utf-8');
  console.log(`   📝 Updated rich-pages.json`);
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// 노션 리치 텍스트를 일반 텍스트로 변환
function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => t.plain_text || '').join('');
}

// 링크 추출
function extractUrl(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  for (const t of richText) {
    if (t.href) return t.href;
    if (t.plain_text && t.plain_text.includes('http')) {
      const match = t.plain_text.match(/https?:\/\/[^\s\)]+/);
      if (match) return match[0];
    }
  }
  return '';
}

// 테이블 데이터 파싱
async function parseTable(blockId) {
  const rows = [];
  const tableRows = await notion.blocks.children.list({ block_id: blockId });

  for (const row of tableRows.results) {
    if (row.type !== 'table_row') continue;
    const cells = row.table_row.cells.map(cell => richTextToPlain(cell));
    rows.push(cells);
  }

  return rows;
}

// ============================================================
// 스마트 파싱: 2-Pass 구조 기반 콘텐츠 분석
// ============================================================

async function parseNotionContent(pageId) {
  // 페이지 속성 가져오기
  const page = await notion.pages.retrieve({ page_id: pageId });
  const props = page.properties;

  const titleProp = props.Title || props.제목 || props.Name;
  const pageTitle = titleProp?.title ? richTextToPlain(titleProp.title) : '';

  const dateProp = props.Date || props.날짜;
  const pageDate = dateProp?.date?.start || new Date().toISOString().split('T')[0];

  const excerptProp = props.Excerpt || props.요약;
  const pageExcerpt = excerptProp?.rich_text ? richTextToPlain(excerptProp.rich_text) : '';

  // 블록 내용 가져오기 (페이지네이션으로 전체 블록 수집)
  let allBlockResults = [];
  let startCursor = undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      start_cursor: startCursor
    });
    allBlockResults = allBlockResults.concat(response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  const blocks = { results: allBlockResults };

  const result = {
    title: pageTitle,
    date: pageDate,
    excerpt: pageExcerpt,
    intro: '',
    topicTitle: '',
    topicExplanation: '',
    summaryTable: [],
    products: [],
    selectionGuide: '',
    comparisonTable: [],
    closing: '',
    faqs: []
  };

  // ========== PASS 1: 구조 분석 ==========
  let tableCount = 0;
  let currentSection = 'intro';
  let currentProduct = null;
  let productSubSection = null; // 제품 내 하위 섹션: 'specs' | 'pros' | 'cons' | 'recommend' | null

  for (let i = 0; i < blocks.results.length; i++) {
    const block = blocks.results[i];
    const type = block.type;

    // ===== h2: 섹션 시작 또는 제품 (번호 패턴이면 제품으로 처리) =====
    if (type === 'heading_2') {
      const text = richTextToPlain(block.heading_2.rich_text);

      // "1. 제품명" 패턴 감지 — 섹션 헤더와 제품명을 구분
      const numberedMatch = text.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        const afterNumber = numberedMatch[2].trim();
        const sectionType = inferSectionType(afterNumber);

        if (sectionType !== null) {
          // 롱테일 or 숏키워드로 인식된 섹션 헤더
          currentSection = sectionType;
          if (sectionType === 'topic' && !result.topicTitle) {
            result.topicTitle = afterNumber;
          }
          currentProduct = null;
          productSubSection = null;
          continue;
        }

        // null → 인식 안 됨 → 제품명으로 처리
        const productName = afterNumber;
        const productId = parseInt(numberedMatch[1]);

        currentSection = 'products';
        currentProduct = {
          id: productId,
          name: productName,
          summary: '',
          keyPoint: '',
          target: '',
          buyUrl: '',
          description: '',
          specs: [],
          pros: [],
          cons: [],
          recommendFor: []
        };
        result.products.push(currentProduct);
        productSubSection = null;
        continue;
      }

      // 번호 없는 h2는 무시 (번호 필수 정책)
      console.warn(`   ⚠️  번호 없는 h2 무시: "${text}"`);
      continue;
    }

    // ===== h3: 제품 리뷰 시작 (숫자. 제품명 or 그냥 제품명) =====
    if (type === 'heading_3') {
      const text = richTextToPlain(block.heading_3.rich_text);

      // 제품 섹션이 아닌 곳의 h3는 제품으로 처리하지 않음
      if (currentSection === 'faq' || currentSection === 'closing' ||
          currentSection === 'guide' || currentSection === 'comparison' ||
          currentSection === 'summary') {
        continue;
      }

      // "1. 제품명" 또는 "제품명" 패턴
      const numberedMatch = text.match(/^(\d+)\.\s*(.+)/);
      const productName = numberedMatch ? numberedMatch[2].trim() : text.trim();

      // ★ 직전 h2에서 만든 currentProduct와 동일한 제품이면 중복 생성하지 않고 재사용
      //   번호가 다르면 무조건 새 제품 (같은 스펙 키워드 공유해도 다른 모델임)
      if (currentProduct && currentSection === 'products') {
        // 번호가 있는 h3: 번호로 확실하게 판별
        if (numberedMatch) {
          const newId = parseInt(numberedMatch[1]);
          if (newId === currentProduct.id) {
            // 같은 번호 → 같은 제품의 상세 h3 (이름 업데이트만)
            if (productName.length > currentProduct.name.length) {
              currentProduct.name = productName;
            }
            productSubSection = null;
            continue;
          }
          // 다른 번호 → 새 제품 (아래에서 생성)
        } else {
          // 번호 없는 h3 → 정확한 이름 일치 또는 높은 비율 유사도만 허용
          const exactMatch = normalizeProductName(currentProduct.name) === normalizeProductName(productName);
          if (exactMatch) {
            if (productName.length > currentProduct.name.length) {
              currentProduct.name = productName;
            }
            productSubSection = null;
            continue;
          }
          // 비율 기반 유사도: 공통 단어가 짧은 쪽의 60% 이상이어야 같은 제품
          const score = getSimilarityScore(currentProduct.name, productName);
          const words1Len = currentProduct.name.toLowerCase().split(/\s+/).filter(w => w.length >= 2).length;
          const words2Len = productName.toLowerCase().split(/\s+/).filter(w => w.length >= 2).length;
          const minWords = Math.min(words1Len, words2Len);
          if (minWords > 0 && score / minWords >= 0.6) {
            if (productName.length > currentProduct.name.length) {
              currentProduct.name = productName;
            }
            productSubSection = null;
            continue;
          }
        }
      }

      // 현재 제품 컨텍스트에서 짧고 숫자 없는 h3 = 서브섹션 헤더 (제품 설명, 장점 등)
      if (currentProduct && productName.length <= 10 && !(/\d/.test(productName))) {
        if (productName.includes('스펙') || productName.includes('사양')) productSubSection = 'specs';
        else if (productName.includes('장점')) productSubSection = 'pros';
        else if (productName.includes('단점')) productSubSection = 'cons';
        else if (productName.includes('추천')) productSubSection = 'recommend';
        continue;
      }

      const productId = numberedMatch ? parseInt(numberedMatch[1]) : result.products.length + 1;

      currentSection = 'products';
      currentProduct = {
        id: productId,
        name: productName,
        summary: '',
        keyPoint: '',
        target: '',
        buyUrl: '',
        description: '',
        specs: [],
        pros: [],
        cons: [],
        recommendFor: []
      };
      result.products.push(currentProduct);
      productSubSection = null;
      continue;
    }

    // ===== 테이블: 위치와 구조로 판별 =====
    if (type === 'table') {
      const tableData = await parseTable(block.id);
      tableCount++;

      if (tableData.length > 0) {
        const headers = tableData[0];

        // 콘텐츠 기반 테이블 종류 판별 (순서가 아닌 구조로 판단)
        if (isSummaryTable(headers) && result.summaryTable.length === 0) {
          result.summaryTable = tableData;
        } else {
          result.comparisonTable = tableData;
        }
      }
      continue;
    }

    // ===== 문단 / 인용 / 콜아웃 통합 처리 =====
    if (type === 'paragraph' || type === 'quote' || type === 'callout') {
      const richText = type === 'paragraph' ? block.paragraph.rich_text
        : type === 'quote' ? block.quote.rich_text
        : block.callout.rich_text;
      const text = richTextToPlain(richText);
      const url = extractUrl(richText);

      if (!text.trim()) continue;

      // 쿠팡파트너스 고지 건너뛰기
      if (text.includes('쿠팡파트너스') || text.includes('파트너스 활동')) continue;

      // 구매 링크 감지
      if (url && isBuyLink(url)) {
        if (currentProduct) {
          currentProduct.buyUrl = url;
        }
        continue;
      }

      // "최저가" 텍스트에서 링크 추출
      if (text.includes('최저가') || text.includes('구매하기') || text.includes('보러가기')) {
        const linkMatch = text.match(/https?:\/\/[^\s\)]+/);
        if (linkMatch && currentProduct) {
          currentProduct.buyUrl = linkMatch[0];
        }
        continue;
      }

      // 제품 섹션 내 bold 라벨 감지 (장점:, 단점:, 주요 스펙:, 추천 대상:)
      if (currentSection === 'products' && currentProduct) {
        const stripped = text.replace(/[\*\s]/g, '').replace(/:$/, '');
        if (stripped.length <= 10) {
          if (stripped.includes('스펙') || stripped.includes('사양')) {
            productSubSection = 'specs';
            continue;
          }
          if (stripped.includes('장점')) {
            productSubSection = 'pros';
            continue;
          }
          if (stripped.includes('단점')) {
            productSubSection = 'cons';
            continue;
          }
          if (stripped.includes('추천') || stripped.includes('타겟') || stripped.includes('대상')) {
            productSubSection = 'recommend';
            continue;
          }
        }
      }

      // 섹션별 문단 처리
      if (currentSection === 'intro') {
        result.intro += text + '\n';
      } else if (currentSection === 'topic') {
        result.topicExplanation += text + '\n';
      } else if (currentSection === 'products' && currentProduct) {
        // 현재 하위 섹션에 따라 라우팅
        if (productSubSection === 'recommend') {
          currentProduct.recommendFor.push(text);
        } else if (productSubSection === 'pros') {
          currentProduct.pros.push(text);
        } else if (productSubSection === 'cons') {
          currentProduct.cons.push(text);
        } else if (text.includes('이런') && text.includes('추천')) {
          // "이런 분께 추천합니다:" 패턴 감지
          const colonIdx = text.indexOf(':');
          const recommendText = colonIdx > 0 ? text.substring(colonIdx + 1).trim() : text.replace(/.*추천합니다\.?\s*/, '').trim();
          if (recommendText) {
            currentProduct.recommendFor.push(recommendText);
          }
        } else {
          currentProduct.description += text + '\n';
        }
      } else if (currentSection === 'guide') {
        result.selectionGuide += text + '\n';
      } else if (currentSection === 'closing') {
        result.closing += text + '\n';
      }
      continue;
    }

    // ===== 불릿 리스트: 스마트 분류 =====
    if (type === 'bulleted_list_item') {
      const text = richTextToPlain(block.bulleted_list_item.rich_text);
      const url = extractUrl(block.bulleted_list_item.rich_text);

      if (!text.trim()) continue;

      // 구매 링크
      if (url && isBuyLink(url) && currentProduct) {
        currentProduct.buyUrl = url;
        continue;
      }

      // FAQ 섹션은 별도 처리 (제품 분류보다 우선)
      if (currentSection === 'faq') {
        if (text.includes('?') || text.startsWith('Q')) {
          result.faqs.push({ q: text.replace(/^Q[:.]\s*/, ''), a: '' });
        } else if ((text.startsWith('A') || text.startsWith('-')) && result.faqs.length > 0) {
          result.faqs[result.faqs.length - 1].a += text.replace(/^A[:.]\s*/, '') + ' ';
        }
        continue;
      }

      // 섹션 헤더 키워드 (중첩 불릿의 부모)
      const trimmedText = text.trim();
      const isSpecHeader = trimmedText.includes('스펙') || trimmedText.includes('사양') || trimmedText.includes('주요');
      // 짧은 텍스트(8자 이하)에서 "장점"/"단점" 포함 = 헤더
      const isProsHeader = (trimmedText.length <= 8 && trimmedText.includes('장점')) || trimmedText.includes('👍');
      const isConsHeader = (trimmedText.length <= 8 && trimmedText.includes('단점')) || trimmedText.includes('👎');
      const isRecommendHeader = trimmedText.includes('추천') || trimmedText.includes('이런 분');

      // 중첩 불릿 처리
      if (block.has_children && currentProduct) {
        try {
          const children = await notion.blocks.children.list({ block_id: block.id });

          for (const child of children.results) {
            if (child.type === 'bulleted_list_item') {
              const childText = richTextToPlain(child.bulleted_list_item.rich_text);
              if (!childText.trim()) continue;

              if (isSpecHeader) {
                // 스펙: key: value 형태
                const colonIdx = childText.indexOf(':');
                if (colonIdx > 0) {
                  currentProduct.specs.push({
                    label: childText.substring(0, colonIdx).trim(),
                    value: childText.substring(colonIdx + 1).trim()
                  });
                }
              } else if (isProsHeader) {
                currentProduct.pros.push(childText);
              } else if (isConsHeader) {
                currentProduct.cons.push(childText);
              } else if (isRecommendHeader) {
                currentProduct.recommendFor.push(childText);
              } else {
                // 헤더가 명확하지 않으면 스마트 분류
                classifyBulletItem(childText, currentProduct);
              }
            }
          }
        } catch (err) {
          console.warn(`   ⚠️  Failed to fetch children for block ${block.id}:`, err.message);
        }
        continue;
      }

      // 플랫 불릿 헤더 → productSubSection 설정 후 건너뛰기
      if (isSpecHeader || isProsHeader || isConsHeader || isRecommendHeader) {
        if (isSpecHeader) productSubSection = 'specs';
        else if (isProsHeader) productSubSection = 'pros';
        else if (isConsHeader) productSubSection = 'cons';
        else if (isRecommendHeader) productSubSection = 'recommend';
        continue;
      }

      // 선택 가이드 섹션 불릿
      if (currentSection === 'guide') {
        result.selectionGuide += '• ' + text + '\n';
        continue;
      }

      // 마무리 섹션 불릿
      if (currentSection === 'closing') {
        result.closing += '• ' + text + '\n';
        continue;
      }

      // topic 섹션 불릿
      if (currentSection === 'topic') {
        result.topicExplanation += '• ' + text + '\n';
        continue;
      }

      // 제품 컨텍스트에서 하위 섹션 기반 분류 (productSubSection 우선)
      if (currentProduct) {
        if (productSubSection === 'specs') {
          const colonIdx = text.indexOf(':');
          if (colonIdx > 0) {
            currentProduct.specs.push({
              label: text.substring(0, colonIdx).trim(),
              value: text.substring(colonIdx + 1).trim()
            });
          } else {
            classifyBulletItem(text, currentProduct);
          }
        } else if (productSubSection === 'pros') {
          currentProduct.pros.push(text);
        } else if (productSubSection === 'cons') {
          currentProduct.cons.push(text);
        } else if (productSubSection === 'recommend') {
          currentProduct.recommendFor.push(text);
        } else {
          classifyBulletItem(text, currentProduct);
        }
      }
      continue;
    }

    // ===== 번호 리스트: 불릿 리스트와 동일하게 처리 =====
    if (type === 'numbered_list_item') {
      const text = richTextToPlain(block.numbered_list_item.rich_text);
      const url = extractUrl(block.numbered_list_item.rich_text);

      if (!text.trim()) continue;

      if (url && isBuyLink(url) && currentProduct) {
        currentProduct.buyUrl = url;
        continue;
      }

      if (currentSection === 'faq') {
        if (text.includes('?') || text.startsWith('Q')) {
          result.faqs.push({ q: text.replace(/^Q[:.]\s*/, ''), a: '' });
        } else if (result.faqs.length > 0) {
          result.faqs[result.faqs.length - 1].a += text.replace(/^A[:.]\s*/, '') + ' ';
        }
        continue;
      }

      if (currentSection === 'guide') {
        result.selectionGuide += '• ' + text + '\n';
        continue;
      }

      if (currentSection === 'closing') {
        result.closing += '• ' + text + '\n';
        continue;
      }

      // topic 섹션 번호 리스트
      if (currentSection === 'topic') {
        result.topicExplanation += '• ' + text + '\n';
        continue;
      }

      if (currentProduct) {
        if (productSubSection === 'specs') {
          const colonIdx = text.indexOf(':');
          if (colonIdx > 0) {
            currentProduct.specs.push({
              label: text.substring(0, colonIdx).trim(),
              value: text.substring(colonIdx + 1).trim()
            });
          } else {
            classifyBulletItem(text, currentProduct);
          }
        } else if (productSubSection === 'pros') {
          currentProduct.pros.push(text);
        } else if (productSubSection === 'cons') {
          currentProduct.cons.push(text);
        } else if (productSubSection === 'recommend') {
          currentProduct.recommendFor.push(text);
        } else {
          classifyBulletItem(text, currentProduct);
        }
      }
      continue;
    }

    // ===== 토글: FAQ 자동 감지 =====
    if (type === 'toggle') {
      const toggleTitle = richTextToPlain(block.toggle.rich_text);

      // 질문 형태면 FAQ로 처리
      if (toggleTitle.includes('?') || currentSection === 'faq') {
        let answer = '';
        if (block.has_children) {
          try {
            const children = await notion.blocks.children.list({ block_id: block.id });
            for (const child of children.results) {
              if (child.type === 'paragraph') {
                answer += richTextToPlain(child.paragraph.rich_text) + ' ';
              } else if (child.type === 'bulleted_list_item') {
                answer += '• ' + richTextToPlain(child.bulleted_list_item.rich_text) + ' ';
              } else if (child.type === 'numbered_list_item') {
                answer += richTextToPlain(child.numbered_list_item.rich_text) + ' ';
              } else if (child.type === 'quote') {
                answer += richTextToPlain(child.quote.rich_text) + ' ';
              }
            }
          } catch (err) {
            console.warn(`   ⚠️  Failed to fetch toggle children for block ${block.id}:`, err.message);
          }
        }

        result.faqs.push({
          q: toggleTitle.replace(/^[▶►]\s*/, '').replace(/^Q[:.]\s*/, '').trim(),
          a: answer.trim()
        });
      }
      continue;
    }
  }

  // ========== PASS 1.5: 중복 제품 병합 ==========
  if (result.products.length > 0) {
    result.products = deduplicateProducts(result.products);
  }

  // ========== PASS 2: 데이터 보완 ==========

  // 요약 테이블에서 제품 정보 추출
  if (result.summaryTable.length > 1 && result.products.length > 0) {
    enrichProductsFromTable(result.summaryTable, result.products);
  }

  // intro가 없으면 topicExplanation 첫 문장 사용 (짧으면 추가)
  if (!result.intro.trim() && result.topicExplanation.trim()) {
    const sentences = result.topicExplanation.split(/(?<=[.!?])\s+/);
    let intro = sentences[0] || '';
    if (intro.length < 30 && sentences.length > 1) {
      intro += ' ' + sentences[1];
    }
    result.intro = intro.trim();
  }

  // topicTitle 기본값
  if (!result.topicTitle && result.title) {
    result.topicTitle = result.title.includes('추천')
      ? result.title.replace(/추천.*/, '') + ', 왜 중요할까요?'
      : '소개';
  }

  return result;
}

// 불릿 아이템 스마트 분류
function classifyBulletItem(text, product) {
  // 스펙 형태 (key: value)
  if (isSpecFormat(text)) {
    const colonIdx = text.indexOf(':');
    product.specs.push({
      label: text.substring(0, colonIdx).trim(),
      value: text.substring(colonIdx + 1).trim()
    });
    return;
  }

  // 긍정/부정 키워드로 분류
  const hasPositive = isPositiveText(text);
  const hasNegative = isNegativeText(text);

  if (hasNegative && !hasPositive) {
    product.cons.push(text);
  } else if (hasPositive && !hasNegative) {
    product.pros.push(text);
  } else {
    // 분류 불가시 설명에 추가 (잘못된 장점 분류 방지)
    product.description += text + '\n';
  }
}

// 테이블에서 제품 정보 보완
function enrichProductsFromTable(table, products) {
  if (table.length < 2) return;

  const headers = table[0].map(h => h.toLowerCase());

  // 컬럼 인덱스 찾기 (유연한 키워드 매칭)
  const findColIdx = (keywords) => {
    return headers.findIndex(h => keywords.some(kw => h.includes(kw)));
  };

  const nameIdx = findColIdx(['제품', '이름', '모델', '노트북']);
  const keyPointIdx = findColIdx(['핵심', '장점', '특징', '포인트']);
  const summaryIdx = findColIdx(['한 줄', '평가', '요약', '코멘트']);
  const targetIdx = findColIdx(['추천', '대상', '타겟', '적합']);

  // 이미 매칭된 제품 추적 (중복 매칭 방지)
  const matched = new Set();

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    const rowIdx = i - 1; // 0-based product index

    let matchedProduct = null;

    // 1차: 이름 유사도 매칭 (가장 정확)
    if (nameIdx >= 0 && row[nameIdx]) {
      const tableName = row[nameIdx];
      let bestScore = 0;
      let bestMatch = null;

      for (const p of products) {
        if (matched.has(p)) continue; // 이미 매칭된 제품 스킵
        const score = getSimilarityScore(tableName, p.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }

      if (bestScore >= 2) {
        matchedProduct = bestMatch;
      }
    }

    // 2차: 순서 매칭 (이름 매칭 실패 시)
    if (!matchedProduct && products[rowIdx] && !matched.has(products[rowIdx])) {
      matchedProduct = products[rowIdx];
    }

    if (matchedProduct) {
      matched.add(matchedProduct);
      if (keyPointIdx >= 0 && row[keyPointIdx]) matchedProduct.keyPoint = row[keyPointIdx];
      if (summaryIdx >= 0 && row[summaryIdx]) matchedProduct.summary = row[summaryIdx];
      if (targetIdx >= 0 && row[targetIdx]) matchedProduct.target = row[targetIdx];
    }
  }
}

// Astro 페이지 템플릿 생성
function generateAstroPage(data) {
  const productsJson = JSON.stringify(data.products, null, 2);
  const faqsJson = JSON.stringify(data.faqs, null, 2);

  // 비교표 데이터 생성
  let comparisonDataCode = '[]';
  let comparisonSpecsCode = '[]';

  if (data.comparisonTable.length > 1) {
    const headers = data.comparisonTable[0];
    const dataRows = data.comparisonTable.slice(1);

    // 테이블 방향 감지
    // Format A: 제품이 열 헤더 (스펙이 행) — "구분 | Prod1 | Prod2" / "CPU | i7 | R7"
    // Format B: 제품이 행 (스펙이 열 헤더) — "제품명 | CPU | GPU" / "Prod1 | i7 | 5060"
    const specDetectKeywords = ['cpu', 'gpu', 'ram', 'ssd', 'hdd', '프로세서', '그래픽', '메모리',
      '저장', '디스플레이', '화면', '배터리', '무게', '크기', '해상도', '주사율', '가격', '운영체제', '포트'];
    const firstColValues = dataRows.map(r => (r[0] || '').toLowerCase());
    const firstColSpecCount = firstColValues.filter(v => specDetectKeywords.some(kw => v.includes(kw))).length;
    const headerSpecCount = headers.slice(1).map(h => h.toLowerCase())
      .filter(h => specDetectKeywords.some(kw => h.includes(kw))).length;

    // Format A: 첫 번째 열에 스펙 키워드가 2개 이상 있거나,
    //           열 수가 제품 수와 일치하고 행 수가 제품 수와 불일치
    const isFormatA = firstColSpecCount >= 2 ||
      (headers.length - 1 === data.products.length && dataRows.length !== data.products.length && firstColSpecCount > headerSpecCount);

    if (isFormatA) {
      // Format A: 제품이 열 → 전치하여 제품별 객체 생성
      const compData = [];
      for (let j = 1; j < headers.length; j++) {
        const product = { name: headers[j] || '' };
        for (let i = 0; i < dataRows.length; i++) {
          const rawLabel = dataRows[i][0] || '';
          const key = rawLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9가-힣_]/g, '') || `row_${i}`;
          product[key] = dataRows[i][j] || '-';
        }
        compData.push(product);
      }
      comparisonDataCode = JSON.stringify(compData, null, 2);
      comparisonSpecsCode = JSON.stringify(
        dataRows.map((r, i) => {
          const label = r[0] || `항목 ${i + 1}`;
          const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9가-힣_]/g, '') || `row_${i}`;
          return { key, label };
        }),
        null, 2
      );
    } else {
      // Format B: 제품이 행 (기존 로직)
      const compData = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const item = { name: row[0] || '' };
        for (let j = 1; j < headers.length; j++) {
          const key = headers[j].toLowerCase().replace(/\s+/g, '_');
          item[key] = row[j] || '-';
        }
        compData.push(item);
      }
      comparisonDataCode = JSON.stringify(compData, null, 2);
      comparisonSpecsCode = JSON.stringify(
        headers.slice(1).map(h => ({ key: h.toLowerCase().replace(/\s+/g, '_'), label: h })),
        null, 2
      );
    }
  } else {
    // 비교표가 없으면 제품 스펙에서 생성
    const compData = data.products.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      cpu: p.specs.find(s => s.label.toLowerCase().includes('cpu'))?.value || '-',
      gpu: p.specs.find(s => s.label.toLowerCase().includes('gpu'))?.value || '-',
      ram: p.specs.find(s => s.label.toLowerCase().includes('ram') || s.label.includes('메모리'))?.value || '-',
      storage: p.specs.find(s => s.label.includes('저장') || s.label.toLowerCase().includes('ssd'))?.value || '-',
      display: p.specs.find(s => s.label.includes('디스플레이') || s.label.includes('화면'))?.value || '-',
      weight: p.specs.find(s => s.label.includes('무게'))?.value || '-',
    }));
    comparisonDataCode = JSON.stringify(compData, null, 2);
    comparisonSpecsCode = `[
  { key: 'cpu', label: 'CPU' },
  { key: 'gpu', label: 'GPU' },
  { key: 'ram', label: 'RAM' },
  { key: 'storage', label: '저장장치' },
  { key: 'display', label: '디스플레이' },
  { key: 'weight', label: '무게' },
]`;
  }

  const introText = data.intro.trim() || `오늘은 ${data.title}에 대해 말씀드릴게요.`;
  const topicTitle = data.topicTitle || '소개';
  const topicText = data.topicExplanation.trim();
  const closingText = data.closing.trim() || '위 내용이 여러분께 도움이 되길 바랍니다.';
  const selectionGuideText = data.selectionGuide.trim();

  const generatedAt = new Date().toISOString();

  return `---
/**
 * Auto-generated from Notion
 * Generated at: ${generatedAt}
 * Do not edit manually
 */
import BaseLayout from '../layouts/BaseLayout.astro';
import Header from '../components/Header.astro';

const products = ${productsJson};
const faqs = ${faqsJson};
const comparisonData = ${comparisonDataCode};
const comparisonSpecs = ${comparisonSpecsCode};
const selectionGuide = ${JSON.stringify(selectionGuideText)};
---

<BaseLayout
  title="${data.title}"
  description="${introText.substring(0, 150).replace(/\n/g, ' ').replace(/"/g, '&quot;')}"
>
  <Header />

  <main>
    <article>
      <header class="article-header">
        <h1>${data.title}</h1>
        <p class="intro-text">${introText}</p>
      </header>

      {products.length > 0 && (
      <section class="section summary-section">
        <h2>핵심만 콕!</h2>
        <div class="table-wrapper">
          <table class="summary-table">
            <thead>
              <tr>
                <th>제품명</th>
                <th>핵심 장점</th>
                <th>한 줄 평</th>
                <th>추천 대상</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr>
                  <td class="product-name-cell">{p.name}</td>
                  <td>{p.keyPoint || '-'}</td>
                  <td>{p.summary || '-'}</td>
                  <td>{p.target || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <section class="section topic-intro">
        <h2>${topicTitle}</h2>
        ${topicText.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\n        ')}
        <div class="affiliate-notice">
          이 포스팅은 쿠팡파트너스 일환으로 수수료를 지급받습니다.
        </div>
      </section>

      {products.length > 0 && (
      <section class="section">
        <h2>상세 리뷰</h2>
        {products.map((product, index) => (
          <div class="product-review" id={\`product-\${product.id}\`}>
            <h3 class="product-title">
              <span class="rank-num">{index + 1}.</span>
              {product.name}
            </h3>
            {product.description && <p class="product-desc">{product.description}</p>}
            <div class="product-content">
              {product.buyUrl && (
              <div class="product-cta">
                <a href={product.buyUrl} class="buy-link" target="_blank" rel="sponsored nofollow">
                  <span class="coupang-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </span>
                  최저가 보러가기
                  <span class="arrow">→</span>
                </a>
              </div>
              )}
              <div class="product-details">
                {product.specs.length > 0 && (
                <div class="spec-block">
                  <h4>주요 스펙</h4>
                  <ul class="spec-list">
                    {product.specs.map(spec => (
                      <li><strong>{spec.label}:</strong> {spec.value}</li>
                    ))}
                  </ul>
                </div>
                )}
                {product.pros.length > 0 && (
                <div class="pros-block">
                  <h4>장점</h4>
                  <ul>
                    {product.pros.map(pro => <li>{pro}</li>)}
                  </ul>
                </div>
                )}
                {product.cons.length > 0 && (
                <div class="cons-block">
                  <h4>단점</h4>
                  <ul>
                    {product.cons.map(con => <li>{con}</li>)}
                  </ul>
                </div>
                )}
                {product.recommendFor.length > 0 && (
                  <div class="recommend-block">
                    <h4>이런 분께 추천합니다</h4>
                    <ul>
                      {product.recommendFor.map(r => <li>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
      )}

      {selectionGuide && (
        <section class="section selection-guide">
          <h2>어떤 제품을 선택해야 할까요?</h2>
          {selectionGuide.split('\\n').filter(p => p.trim()).map(p => (
            p.startsWith('•') || p.startsWith('-')
              ? <p class="guide-item">{p.replace(/^[•-]\s*/, '')}</p>
              : <p>{p}</p>
          ))}
        </section>
      )}

      {comparisonData.length > 0 && (
      <section class="section">
        <h2>제품 비교표</h2>
        <div class="table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>항목</th>
                {comparisonData.map(p => <th>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparisonSpecs.map(spec => (
                <tr>
                  <th>{spec.label}</th>
                  {comparisonData.map(p => <td>{p[spec.key] || '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <section class="section closing">
        <h2>마무리</h2>
        <p>${closingText}</p>
      </section>

      {faqs.length > 0 && (
        <section class="section faq-section">
          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="faq-list">
            {faqs.map(faq => (
              <details class="faq-item">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </article>
  </main>
</BaseLayout>

<style>
  main { max-width: 900px; margin: 0 auto; padding: 0 20px 80px; }
  .article-header { padding: 3rem 0 2rem; border-bottom: 2px solid #1A1A1A; margin-bottom: 2rem; }
  .article-header h1 { font-size: 38px; font-weight: 800; color: #1A1A1A; margin: 0 0 16px; }
  .intro-text { font-size: 19px; line-height: 1.8; color: #333; }
  .section { padding: 2.5rem 0; border-bottom: 1px solid #eee; }
  .section h2 { font-size: 29px; font-weight: 800; color: #1A1A1A; margin: 0 0 20px; }
  .section p { font-size: 19px; line-height: 1.8; color: #333; margin-bottom: 16px; }
  .table-wrapper { overflow-x: auto; border: 1px solid #ddd; border-radius: 8px; }
  .summary-table { width: 100%; min-width: 700px; border-collapse: collapse; font-size: 17px; }
  .summary-table th, .summary-table td { padding: 14px 12px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
  .summary-table thead th { background: #1A1A1A; color: #fff; font-weight: 600; }
  .summary-table tbody tr:hover { background: #f9f9f9; }
  .product-name-cell { font-weight: 600; color: #1A1A1A; min-width: 180px; }
  .topic-intro p { text-indent: 1em; }
  .affiliate-notice { margin-top: 24px; padding: 12px 16px; background: #FEF3C7; border-radius: 6px; font-size: 17px; color: #92400E; }
  .product-review { padding: 2rem 0; border-bottom: 1px solid #eee; }
  .product-review:last-child { border-bottom: none; }
  .product-title { font-size: 26px; font-weight: 700; color: #1A1A1A; margin: 0 0 12px; }
  .rank-num { color: #256FFF; }
  .product-desc { font-size: 18px; line-height: 1.7; color: #555; margin-bottom: 20px; }
  .product-content { display: block; }
  .product-cta { margin: 20px 0 24px; }
  .buy-link { display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px; background: linear-gradient(135deg, #FF455B 0%, #E63E50 100%); color: #fff; font-size: 18px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 69, 91, 0.35); transition: all 0.2s ease; }
  .buy-link:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 69, 91, 0.45); }
  .coupang-icon { display: flex; align-items: center; }
  .buy-link .arrow { transition: transform 0.2s; }
  .buy-link:hover .arrow { transform: translateX(4px); }
  .product-details h4 { font-size: 18px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .spec-block, .pros-block, .cons-block, .recommend-block { margin-bottom: 20px; }
  .spec-list { margin: 0; padding: 0; list-style: none; }
  .spec-list li { font-size: 16px; line-height: 1.6; color: #444; padding: 4px 0; }
  .spec-list li strong { color: #1A1A1A; }
  .pros-block ul, .cons-block ul, .recommend-block ul { margin: 0; padding-left: 20px; font-size: 16px; line-height: 1.7; }
  .pros-block ul li { color: #166534; }
  .cons-block ul li { color: #991B1B; }
  .recommend-block ul li { color: #1E40AF; }
  .comparison-table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 14px; }
  .comparison-table th, .comparison-table td { padding: 10px 8px; text-align: center; border: 1px solid #ddd; vertical-align: top; }
  .comparison-table thead th { background: #1A1A1A; color: #fff; font-weight: 600; }
  .comparison-table tbody th { background: #f5f5f5; font-weight: 600; text-align: left; padding-left: 12px; }
  .closing p { font-size: 19px; }
  .faq-list { display: flex; flex-direction: column; gap: 12px; }
  .faq-item { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
  .faq-item summary { padding: 16px 20px; font-size: 18px; font-weight: 600; color: #1A1A1A; cursor: pointer; background: #fff; list-style: none; }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item summary::before { content: "▶ "; font-size: 12px; color: #666; }
  .faq-item[open] summary::before { content: "▼ "; }
  .faq-item p { padding: 16px 20px; margin: 0; font-size: 17px; line-height: 1.8; color: #555; background: #fafafa; border-top: 1px solid #eee; }
  .selection-guide p { font-size: 18px; line-height: 1.8; margin-bottom: 12px; }
  .selection-guide .guide-item { padding-left: 20px; position: relative; }
  .selection-guide .guide-item::before { content: "•"; position: absolute; left: 0; color: #256FFF; font-weight: bold; }
  @media (max-width: 768px) {
    .article-header h1 { font-size: 31px; }
    .buy-link { width: 100%; justify-content: center; }
  }
</style>
`;
}

// 메인 함수
async function generateRichPage(pageId) {
  console.log(`📄 Parsing Notion page: ${pageId}`);

  const data = await parseNotionContent(pageId);

  if (!data.title) {
    console.log('⚠️  No title found, skipping');
    return null;
  }

  // 기존 pageId가 있으면 slug 유지 (제목 바뀌어도 URL 변경 안 함)
  let slug = null;
  if (fs.existsSync(RICH_PAGES_JSON)) {
    try {
      const registry = JSON.parse(fs.readFileSync(RICH_PAGES_JSON, 'utf-8'));
      const existing = registry.find(p => p.notionPageId === pageId);
      if (existing) {
        slug = existing.slug;
      }
    } catch (e) { /* ignore */ }
  }
  if (!slug) {
    slug = generateSlug(data.title);
  }
  console.log(`   Title: ${data.title}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Products: ${data.products.length}`);
  console.log(`   FAQs: ${data.faqs.length}`);

  const astroContent = generateAstroPage(data);
  const filePath = path.join(PAGES_DIR, `${slug}.astro`);

  fs.writeFileSync(filePath, astroContent, 'utf-8');
  console.log(`✅ Generated: ${slug}.astro`);

  // 자동 생성 excerpt (intro에서 추출)
  let excerpt = data.excerpt;
  if (!excerpt && data.intro) {
    excerpt = data.intro.substring(0, 150).trim();
    if (data.intro.length > 150) excerpt += '...';
  }

  // 홈페이지 목록용 메타데이터 저장 (notionPageId로 중복 방지)
  updateRichPagesRegistry({
    slug: slug,
    title: data.title,
    date: data.date,
    excerpt: excerpt || `${data.title}에 대한 리뷰입니다.`,
    isRichPage: true,
    notionPageId: pageId
  });

  return slug;
}

module.exports = { generateRichPage, parseNotionContent };

// CLI 실행
if (require.main === module) {
  const pageId = process.argv[2] || process.env.SYNC_PAGE_ID;
  if (!pageId) {
    console.error('Usage: node generate-rich-page.cjs <page_id>');
    process.exit(1);
  }
  generateRichPage(pageId).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
