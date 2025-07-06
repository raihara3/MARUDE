import { useState } from "react";
import type { Background } from "../types";

interface BackgroundSelectorProps {
  selectedBackground: Background | null;
  onSelectBackground: (background: Background | null) => void;
}

const backgrounds: Background[] = [
  {
    id: "living-room",
    name: "リビングルーム",
    url: "/backgrounds/living-room.jpg",
    thumbnail: "/backgrounds/living-room-thumb.jpg",
  },
  {
    id: "cafe",
    name: "カフェ",
    url: "/backgrounds/cafe.jpg",
    thumbnail: "/backgrounds/cafe-thumb.jpg",
  },
  {
    id: "nature",
    name: "自然",
    url: "/backgrounds/nature.jpg",
    thumbnail: "/backgrounds/nature-thumb.jpg",
  },
  {
    id: "office",
    name: "オフィス",
    url: "/backgrounds/office.jpg",
    thumbnail: "/backgrounds/office-thumb.jpg",
  },
  {
    id: "abstract",
    name: "アブストラクト",
    url: "/backgrounds/abstract.jpg",
    thumbnail: "/backgrounds/abstract-thumb.jpg",
  },
];

export function BackgroundSelector({
  selectedBackground,
  onSelectBackground,
}: BackgroundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white/80 hover:bg-white rounded-lg shadow-md transition-all"
        title="背景を変更"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-16 right-0 bg-white rounded-xl shadow-xl p-4 w-64">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            バーチャル背景
          </h3>

          <div className="space-y-2">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => {
                  onSelectBackground(bg);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedBackground?.id === bg.id
                    ? "bg-orange-100 text-gray-800"
                    : "hover:bg-gray-100"
                }`}
              >
                {bg.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
