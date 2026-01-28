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
  '저렴', '가성비', '효율', '안정', '조용', '쿨링', '오래', '내구'
];

// 부정적 키워드 (단점 판별)
const NEGATIVE_KEYWORDS = [
  '아쉬', '부족', '느린', '느리', '비싼', '비싸', '무거', '불편',
  '어려', '시끄러', '발열', '뜨거', '약한', '좁은', '낮은', '짧은',
  '제한', '단점', '아쉬움', '불안정'
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

// 테이블이 요약 테이블인지 판별 (제품명/이름 컬럼 존재)
function isSummaryTable(headers) {
  const summaryKeywords = ['제품', '이름', '모델', '노트북', '상품'];
  return headers.some(h => summaryKeywords.some(kw => h.includes(kw)));
}

// h2 제목으로 섹션 타입 추론
function inferSectionType(title) {
  const t = title.toLowerCase();

  // FAQ 섹션
  if (t.includes('faq') || t.includes('자주') || t.includes('질문') || t.includes('q&a')) {
    return 'faq';
  }
  // 마무리/결론 섹션
  if (t.includes('마무리') || t.includes('마치') || t.includes('결론') || t.includes('정리')) {
    return 'closing';
  }
  // 비교 섹션
  if (t.includes('비교')) {
    return 'comparison';
  }
  // 선택 가이드
  if (t.includes('선택') || t.includes('가이드') || t.includes('고르') || t.includes('어떤')) {
    return 'guide';
  }
  // 상세 리뷰 (top, 추천, 리뷰 등)
  if (t.includes('top') || t.includes('추천') || t.includes('리뷰') || t.includes('상세')) {
    return 'products';
  }
  // 요약 테이블 섹션
  if (t.includes('핵심') || t.includes('요약') || t.includes('한눈')) {
    return 'summary';
  }
  // 기타는 소개/설명 섹션
  return 'topic';
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
    const oldSlug = registry[existingIndex].slug;

    // slug가 변경됐으면 이전 .astro 파일 삭제
    if (oldSlug !== pageData.slug) {
      const oldFilePath = path.join(PAGES_DIR, `${oldSlug}.astro`);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`   🗑️  Deleted old file: ${oldSlug}.astro (title changed)`);
      }
    }

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

  // 블록 내용 가져오기
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });

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
  let pendingBullets = []; // 섹션 헤더 없이 온 불릿들

  for (let i = 0; i < blocks.results.length; i++) {
    const block = blocks.results[i];
    const type = block.type;

    // ===== h2: 섹션 시작 =====
    if (type === 'heading_2') {
      const text = richTextToPlain(block.heading_2.rich_text);
      const sectionType = inferSectionType(text);

      // topic 섹션이고 아직 topicTitle이 없으면 설정
      if (sectionType === 'topic' && !result.topicTitle) {
        result.topicTitle = text;
      }

      currentSection = sectionType;
      currentProduct = null;
      pendingBullets = [];
      continue;
    }

    // ===== h3: 제품 리뷰 시작 (숫자. 제품명 or 그냥 제품명) =====
    if (type === 'heading_3') {
      const text = richTextToPlain(block.heading_3.rich_text);

      // "1. 제품명" 또는 "제품명" 패턴
      const numberedMatch = text.match(/^(\d+)\.\s*(.+)/);
      const productName = numberedMatch ? numberedMatch[2].trim() : text.trim();
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
      pendingBullets = [];
      continue;
    }

    // ===== 테이블: 위치와 구조로 판별 =====
    if (type === 'table') {
      const tableData = await parseTable(block.id);
      tableCount++;

      if (tableData.length > 0) {
        const headers = tableData[0];

        // 첫 번째 테이블 또는 요약 테이블 패턴
        if (tableCount === 1 || isSummaryTable(headers)) {
          if (result.summaryTable.length === 0) {
            result.summaryTable = tableData;
          }
        } else {
          // 두 번째 이후 테이블은 비교표
          result.comparisonTable = tableData;
        }
      }
      continue;
    }

    // ===== 문단 =====
    if (type === 'paragraph') {
      const text = richTextToPlain(block.paragraph.rich_text);
      const url = extractUrl(block.paragraph.rich_text);

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

      // 섹션별 문단 처리
      if (currentSection === 'intro') {
        result.intro += text + '\n';
      } else if (currentSection === 'topic') {
        result.topicExplanation += text + '\n';
      } else if (currentSection === 'products' && currentProduct) {
        // "이런 분께 추천합니다:" 패턴 감지 (다양한 변형 대응)
        if (text.includes('이런') && text.includes('추천')) {
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

      // 섹션 헤더 키워드 (중첩 불릿의 부모)
      const isSpecHeader = text.includes('스펙') || text.includes('사양');
      const isProsHeader = text === '장점' || text.startsWith('장점:') || text.includes('👍');
      const isConsHeader = text === '단점' || text.startsWith('단점:') || text.includes('👎');
      const isRecommendHeader = text.includes('추천') || text.includes('이런 분');

      // 중첩 불릿 처리
      if (block.has_children && currentProduct) {
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
        continue;
      }

      // 플랫 불릿 (헤더만 있는 경우 건너뛰기)
      if (isSpecHeader || isProsHeader || isConsHeader || isRecommendHeader) {
        continue;
      }

      // 제품 컨텍스트에서 스마트 분류
      if (currentProduct) {
        classifyBulletItem(text, currentProduct);
      }

      // FAQ 섹션
      if (currentSection === 'faq') {
        if (text.includes('?') || text.startsWith('Q')) {
          result.faqs.push({ q: text.replace(/^Q[:.]\s*/, ''), a: '' });
        } else if ((text.startsWith('A') || text.startsWith('-')) && result.faqs.length > 0) {
          result.faqs[result.faqs.length - 1].a += text.replace(/^A[:.]\s*/, '') + ' ';
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
          const children = await notion.blocks.children.list({ block_id: block.id });
          for (const child of children.results) {
            if (child.type === 'paragraph') {
              answer += richTextToPlain(child.paragraph.rich_text) + ' ';
            } else if (child.type === 'bulleted_list_item') {
              answer += '• ' + richTextToPlain(child.bulleted_list_item.rich_text) + ' ';
            }
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

  // ========== PASS 2: 데이터 보완 ==========

  // 요약 테이블에서 제품 정보 추출
  if (result.summaryTable.length > 1 && result.products.length > 0) {
    enrichProductsFromTable(result.summaryTable, result.products);
  }

  // intro가 없으면 topicExplanation 첫 문장 사용
  if (!result.intro.trim() && result.topicExplanation.trim()) {
    const firstSentence = result.topicExplanation.split('.')[0];
    result.intro = firstSentence ? firstSentence + '.' : '';
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
    // 분류 불가시 장점으로 (대부분 장점을 먼저 씀)
    product.pros.push(text);
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

  // 테이블 행과 제품 매칭
  for (let i = 1; i < table.length; i++) {
    const row = table[i];

    // 제품명으로 매칭 시도
    let matchedProduct = null;

    if (nameIdx >= 0 && row[nameIdx]) {
      const tableName = row[nameIdx].toLowerCase();
      matchedProduct = products.find(p =>
        p.name.toLowerCase().includes(tableName) ||
        tableName.includes(p.name.toLowerCase().substring(0, 10))
      );
    }

    // 매칭 실패시 순서대로
    if (!matchedProduct && i <= products.length) {
      matchedProduct = products[i - 1];
    }

    if (matchedProduct) {
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
    const compData = [];

    for (let i = 1; i < data.comparisonTable.length; i++) {
      const row = data.comparisonTable[i];
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

  return `---
import BaseLayout from '../layouts/BaseLayout.astro';
import Header from '../components/Header.astro';

const products = ${productsJson};
const faqs = ${faqsJson};
const comparisonData = ${comparisonDataCode};
const comparisonSpecs = ${comparisonSpecsCode};
---

<BaseLayout
  title="${data.title}"
  description="${introText.substring(0, 150).replace(/\n/g, ' ').replace(/"/g, '\\"')}"
>
  <Header />

  <main>
    <article>
      <header class="article-header">
        <h1>${data.title}</h1>
        <p class="intro-text">${introText}</p>
      </header>

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
                  <td>{p.keyPoint}</td>
                  <td>{p.summary}</td>
                  <td>{p.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section topic-intro">
        <h2>${topicTitle}</h2>
        ${topicText.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('\n        ')}
        <div class="affiliate-notice">
          이 포스팅은 쿠팡파트너스 일환으로 수수료를 지급받습니다.
        </div>
      </section>

      <section class="section">
        <h2>상세 리뷰</h2>
        {products.map((product, index) => (
          <div class="product-review" id={\`product-\${product.id}\`}>
            <h3 class="product-title">
              <span class="rank-num">{index + 1}.</span>
              {product.name}
            </h3>
            <p class="product-desc">{product.description}</p>
            <div class="product-content">
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
              <div class="product-details">
                <div class="spec-block">
                  <h4>주요 스펙</h4>
                  <ul class="spec-list">
                    {product.specs.map(spec => (
                      <li><strong>{spec.label}:</strong> {spec.value}</li>
                    ))}
                  </ul>
                </div>
                <div class="pros-block">
                  <h4>장점</h4>
                  <ul>
                    {product.pros.map(pro => <li>{pro}</li>)}
                  </ul>
                </div>
                <div class="cons-block">
                  <h4>단점</h4>
                  <ul>
                    {product.cons.map(con => <li>{con}</li>)}
                  </ul>
                </div>
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

  const slug = generateSlug(data.title);
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
