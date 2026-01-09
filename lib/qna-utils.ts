export interface QnAItem {
  question: string;
  answer: string;
}

export function extractQnA(content: string): QnAItem[] {
  const items: QnAItem[] = [];
  const lines = content.split('\n');

  let currentQuestion = '';
  let currentAnswer = '';
  let inQnA = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.match(/^##.*Q&?A|^##.*질문/i)) {
      inQnA = true;
      continue;
    }

    if (inQnA && (line.startsWith('## ') || line === '---')) {
      if (currentQuestion && currentAnswer) {
        items.push({
          question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
          answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
        });
      }
      if (line.startsWith('## ')) {
        inQnA = false;
      }
      break;
    }

    if (inQnA && line.match(/^\*\*Q\./)) {
      if (currentQuestion && currentAnswer) {
        items.push({
          question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
          answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
        });
      }
      currentQuestion = line;
      currentAnswer = '';
      continue;
    }

    if (inQnA && line.match(/^A\./)) {
      currentAnswer = line;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine === '' || nextLine.match(/^\*\*Q\./)) {
          break;
        }
        currentAnswer += ' ' + nextLine;
        i = j;
      }
    }
  }

  if (currentQuestion && currentAnswer) {
    items.push({
      question: currentQuestion.replace(/^\*\*Q\.\s*|\*\*$/g, '').trim(),
      answer: currentAnswer.replace(/^A\.\s*/g, '').trim()
    });
  }

  return items;
}

export function removeQnASection(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inQnA = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^##.*Q&?A|^##.*질문/i)) {
      inQnA = true;
      continue;
    }

    if (inQnA && (trimmed.startsWith('## ') || trimmed === '---')) {
      if (trimmed === '---') continue;
      inQnA = false;
    }

    if (!inQnA) {
      result.push(line);
    }
  }

  return result.join('\n');
}
