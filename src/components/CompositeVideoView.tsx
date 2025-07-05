import { useEffect, useRef, useState } from "react";

interface Participant {
  id: string;
  stream: MediaStream | null;
  name: string;
  x?: number;
  y?: number;
}

interface CompositeVideoViewProps {
  participants: Participant[];
}

export function CompositeVideoView({ participants }: CompositeVideoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [participantPositions, setParticipantPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // 参加者の位置を自動配置
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const positions = new Map<string, { x: number; y: number }>();

    // 参加者数に応じて配置を計算
    const count = participants.length;
    const radius = Math.min(containerWidth, containerHeight) * 0.3;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    participants.forEach((participant, index) => {
      let x, y;

      if (count === 1) {
        // 1人の場合は中央
        x = centerX - 150;
        y = centerY - 200;
      } else if (count === 2) {
        // 2人の場合は左右に配置
        x = centerX + (index === 0 ? -200 : 50);
        y = centerY - 200;
      } else {
        // 3人以上の場合は円形に配置
        const angle = (index * 2 * Math.PI) / count - Math.PI / 2;
        x = centerX + radius * Math.cos(angle) - 150;
        y = centerY + radius * Math.sin(angle) - 200;
      }

      positions.set(participant.id, { x, y });
    });

    setParticipantPositions(positions);
  }, [participants]);

  // ビデオ要素の管理
  useEffect(() => {
    participants.forEach((participant) => {
      if (participant.stream && !videoRefs.current.has(participant.id)) {
        const video = document.createElement("video");
        video.srcObject = participant.stream;
        video.playsInline = true;
        video.muted = participant.id === "local";
        video.play().catch(console.warn);
        videoRefs.current.set(participant.id, video);
      }
    });

    // 不要なビデオ要素を削除
    const currentParticipantIds = new Set(participants.map((p) => p.id));
    videoRefs.current.forEach((video, id) => {
      if (!currentParticipantIds.has(id)) {
        video.srcObject = null;
        videoRefs.current.delete(id);
      }
    });
  }, [participants]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100"
    >
      <div
        className="w-full h-full grid gap-4 p-4 box-border"
        style={{
          gridTemplateColumns:
            participants.length <= 2
              ? `repeat(${participants.length}, 1fr)`
              : "repeat(2, 1fr)",
          gridTemplateRows: participants.length > 2 ? "repeat(2, 1fr)" : "1fr",
        }}
      >
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="relative bg-gray-200 rounded-lg overflow-hidden"
          >
            {participant.stream ? (
              <video
                autoPlay
                playsInline
                muted={participant.id === "local"}
                ref={(video) => {
                  if (video && participant.stream) {
                    video.srcObject = participant.stream;
                  }
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span className="text-gray-600">カメラ準備中...</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {participant.name}
            </div>
          </div>
        ))}

        {participants.length === 0 && (
          <div className="col-span-2 flex items-center justify-center text-gray-500">
            参加者を待っています...
          </div>
        )}
      </div>
    </div>
  );
}
