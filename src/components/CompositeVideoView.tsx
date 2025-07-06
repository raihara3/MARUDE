import { useEffect, useRef } from "react";

interface Participant {
  id: string;
  stream: MediaStream | null;
  name: string;
  x?: number;
  y?: number;
}

interface CompositeVideoViewProps {
  participants: Participant[];
  myBackgroundSide?: "left" | "right" | "center" | null;
  remoteBackgroundSide?: "left" | "right" | "center" | null;
  selectedBackground?: {
    id: string;
    name: string;
    url: string;
    thumbnail: string;
  } | null;
}

export function CompositeVideoView({
  participants,
  myBackgroundSide = null,
  selectedBackground = null,
}: CompositeVideoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

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

  // 背景の位置に基づいて参加者を並び替え
  const sortedParticipants = [...participants];

  if (participants.length === 2 || participants.length === 3) {
    sortedParticipants.sort((a, b) => {
      // 自分の位置を基準に並び替え
      const getPosition = (participant: Participant) => {
        if (participant.id === "local") {
          // 自分の場合
          if (myBackgroundSide === "left") return 0;
          if (myBackgroundSide === "center") return 1;
          if (myBackgroundSide === "right") return 2;
          return 0; // デフォルトは左
        } else {
          // リモート参加者の場合、IDで順序を決定
          if (participants.length === 2) {
            // 2人の場合：自分がleftなら相手はright、自分がrightなら相手はleft
            return myBackgroundSide === "left" ? 2 : 0;
          } else {
            // 3人の場合：自分以外の位置を割り当て
            const otherParticipants = participants.filter(
              (p) => p.id !== "local"
            );
            const myIndex = otherParticipants.findIndex(
              (p) => p.id === participant.id
            );

            if (myBackgroundSide === "left") {
              return myIndex === 0 ? 1 : 2; // center, right
            } else if (myBackgroundSide === "center") {
              return myIndex === 0 ? 0 : 2; // left, right
            } else {
              return myIndex === 0 ? 0 : 1; // left, center
            }
          }
        }
      };

      return getPosition(a) - getPosition(b);
    });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100"
    >
      {/* 2人または3人の時の背景画像 */}
      {(participants.length === 2 || participants.length === 3) &&
        selectedBackground && (
          <div
            className="absolute inset-0 bg-no-repeat bg-bottom"
            style={{
              backgroundImage: `url(${selectedBackground.url})`,
              backgroundSize: "100%",
              zIndex: 1,
            }}
          />
        )}

      <div
        className="w-full grid box-border absolute bottom-0"
        style={{
          gridTemplateColumns:
            participants.length <= 3
              ? `repeat(${participants.length}, 1fr)`
              : "repeat(2, 1fr)",
          gridTemplateRows: participants.length > 3 ? "repeat(2, 1fr)" : "1fr",
          zIndex: 2,
        }}
      >
        {sortedParticipants.map((participant) => (
          <div key={participant.id} className="relative overflow-hidden">
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
                className="w-full h-full"
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
