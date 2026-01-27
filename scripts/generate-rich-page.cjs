/**
 * 노션 컨텐츠를 리치 UI Astro 페이지로 변환
 * - 모든 글을 리치 UI 형식으로 통일
 * - 이미지 없이 CTA 버튼만 사용
 * - 장점(녹색), 단점(빨강), 추천(파랑) 색상
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const PAGES_DIR = path.join(process.cwd(), 'src/pages');

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

// 노션 블록들을 파싱하여 구조화된 데이터 추출
async function parseNotionContent(pageId) {
  // 페이지 제목 가져오기
  const page = await notion.pages.retrieve({ page_id: pageId });
  const titleProp = page.properties.Title || page.properties.제목 || page.properties.Name;
  const pageTitle = titleProp?.title ? richTextToPlain(titleProp.title) : '';

  // 블록 내용 가져오기
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });

  const result = {
    title: pageTitle,
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

  let currentSection = 'intro';
  let currentProduct = null;
  let currentSubSection = null;
  let collectingSpecs = false;
  let collectingPros = false;
  let collectingCons = false;
  let collectingRecommend = false;

  for (let i = 0; i < blocks.results.length; i++) {
    const block = blocks.results[i];
    const type = block.type;

    // h2 섹션 제목
    if (type === 'heading_2') {
      const text = richTextToPlain(block.heading_2.rich_text);

      // 섹션 구분
      if (text.includes('핵심만 콕')) {
        currentSection = 'summary';
      } else if (text.includes('상세 리뷰') || text.includes('Top5') || text.includes('TOP5')) {
        currentSection = 'products';
      } else if (text.includes('선택') || text.includes('어떤 제품')) {
        currentSection = 'guide';
      } else if (text.includes('비교표')) {
        currentSection = 'comparison';
      } else if (text.includes('마치며') || text.includes('마무리')) {
        currentSection = 'closing';
      } else if (text.includes('FAQ') || text.includes('자주 묻는')) {
        currentSection = 'faq';
      } else if (!result.topicTitle && currentSection === 'intro') {
        // 첫 번째 h2는 주제 설명 제목
        result.topicTitle = text;
        currentSection = 'topic';
      }

      currentProduct = null;
      collectingSpecs = false;
      collectingPros = false;
      collectingCons = false;
      collectingRecommend = false;
      continue;
    }

    // h3 - 제품 제목 (1. 제품명, 2. 제품명 등)
    if (type === 'heading_3') {
      const text = richTextToPlain(block.heading_3.rich_text);
      const productMatch = text.match(/^(\d+)\.\s*(.+)/);

      if (productMatch) {
        currentSection = 'products';
        currentProduct = {
          id: parseInt(productMatch[1]),
          name: productMatch[2].trim(),
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
        collectingSpecs = false;
        collectingPros = false;
        collectingCons = false;
        collectingRecommend = false;
      }
      continue;
    }

    // 테이블 (요약 테이블 또는 비교표)
    if (type === 'table') {
      const tableData = await parseTable(block.id);

      if (currentSection === 'summary' || result.summaryTable.length === 0) {
        result.summaryTable = tableData;
      } else if (currentSection === 'comparison') {
        result.comparisonTable = tableData;
      }
      continue;
    }

    // 문단
    if (type === 'paragraph') {
      const text = richTextToPlain(block.paragraph.rich_text);
      const url = extractUrl(block.paragraph.rich_text);

      if (!text.trim()) continue;

      // 쿠팡 링크 감지
      if (url && url.includes('coupang.com') && currentProduct) {
        currentProduct.buyUrl = url;
        continue;
      }

      if (text.includes('최저가 보러가기') && currentProduct) {
        const linkMatch = text.match(/https?:\/\/[^\s\)]+/);
        if (linkMatch) currentProduct.buyUrl = linkMatch[0];
        continue;
      }

      // 쿠팡파트너스 고지는 건너뛰기
      if (text.includes('쿠팡파트너스')) continue;

      if (currentSection === 'intro' && !result.topicTitle) {
        result.intro += text + '\n';
      } else if (currentSection === 'topic') {
        result.topicExplanation += text + '\n';
      } else if (currentSection === 'products' && currentProduct) {
        // 제품 설명 문단
        if (!collectingSpecs && !collectingPros && !collectingCons && !collectingRecommend) {
          currentProduct.description += text + '\n';
        }
      } else if (currentSection === 'guide') {
        result.selectionGuide += text + '\n';
      } else if (currentSection === 'closing') {
        result.closing += text + '\n';
      }
      continue;
    }

    // 불릿 리스트
    if (type === 'bulleted_list_item') {
      const text = richTextToPlain(block.bulleted_list_item.rich_text);

      if (!text.trim()) continue;

      // 섹션 구분 키워드
      if (text.includes('주요 스펙') || text.includes('스펙')) {
        collectingSpecs = true;
        collectingPros = false;
        collectingCons = false;
        collectingRecommend = false;
        continue;
      }
      if (text === '장점' || text.startsWith('장점')) {
        collectingSpecs = false;
        collectingPros = true;
        collectingCons = false;
        collectingRecommend = false;
        if (text === '장점') continue;
      }
      if (text === '단점' || text.startsWith('단점')) {
        collectingSpecs = false;
        collectingPros = false;
        collectingCons = true;
        collectingRecommend = false;
        if (text === '단점') continue;
      }
      if (text.includes('추천') || text.includes('이런 분께')) {
        collectingSpecs = false;
        collectingPros = false;
        collectingCons = false;
        collectingRecommend = true;
        continue;
      }

      // 현재 제품에 데이터 추가
      if (currentProduct) {
        if (collectingPros) {
          currentProduct.pros.push(text);
        } else if (collectingCons) {
          currentProduct.cons.push(text);
        } else if (collectingRecommend) {
          currentProduct.recommendFor.push(text);
        } else if (collectingSpecs) {
          // 스펙은 "CPU: Intel..." 형태
          const colonIdx = text.indexOf(':');
          if (colonIdx > 0) {
            currentProduct.specs.push({
              label: text.substring(0, colonIdx).trim(),
              value: text.substring(colonIdx + 1).trim()
            });
          }
        }
      }

      // FAQ 토글 항목
      if (currentSection === 'faq') {
        if (text.startsWith('Q') || text.includes('?')) {
          result.faqs.push({ q: text.replace(/^Q[:.]\s*/, ''), a: '' });
        } else if (text.startsWith('A') && result.faqs.length > 0) {
          result.faqs[result.faqs.length - 1].a = text.replace(/^A[:.]\s*/, '');
        }
      }
      continue;
    }

    // 토글 (FAQ)
    if (type === 'toggle') {
      const toggleTitle = richTextToPlain(block.toggle.rich_text);

      if (currentSection === 'faq' || toggleTitle.includes('?')) {
        // 토글 내용 가져오기
        let answer = '';
        if (block.has_children) {
          const children = await notion.blocks.children.list({ block_id: block.id });
          for (const child of children.results) {
            if (child.type === 'paragraph') {
              answer += richTextToPlain(child.paragraph.rich_text) + ' ';
            }
          }
        }

        result.faqs.push({
          q: toggleTitle.replace(/^▶\s*/, '').replace(/^Q[:.]\s*/, ''),
          a: answer.trim().replace(/^A[:.]\s*/, '')
        });
      }
      continue;
    }
  }

  // 요약 테이블에서 제품 정보 보완
  if (result.summaryTable.length > 1 && result.products.length > 0) {
    const headers = result.summaryTable[0];
    const keyPointIdx = headers.findIndex(h => h.includes('핵심') || h.includes('장점'));
    const summaryIdx = headers.findIndex(h => h.includes('한 줄') || h.includes('평'));
    const targetIdx = headers.findIndex(h => h.includes('추천') || h.includes('대상'));

    for (let i = 1; i < result.summaryTable.length && i <= result.products.length; i++) {
      const row = result.summaryTable[i];
      const product = result.products[i - 1];

      if (keyPointIdx >= 0 && row[keyPointIdx]) product.keyPoint = row[keyPointIdx];
      if (summaryIdx >= 0 && row[summaryIdx]) product.summary = row[summaryIdx];
      if (targetIdx >= 0 && row[targetIdx]) product.target = row[targetIdx];
    }
  }

  return result;
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
