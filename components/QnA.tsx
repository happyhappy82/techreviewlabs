"use client";

import { useState } from "react";
import { QnAItem } from "@/lib/qna-utils";

interface QnAProps {
  items: QnAItem[];
}

export default function QnA({ items }: QnAProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="mt-12 mb-8">
      <h2 className="text-2xl font-bold mb-6">자주 묻는 질문</h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex justify-between items-center"
            >
              <span className="font-semibold text-gray-900">
                {item.question}
              </span>
              <span className="text-gray-500 ml-4">
                {openIndex === index ? "−" : "+"}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-700">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
