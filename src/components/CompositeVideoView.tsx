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
  myBackgroundSide?: "left" | "right" | null;
  remoteBackgroundSide?: "left" | "right" | null;
}

export function CompositeVideoView({
  participants,
  myBackgroundSide = null,
  remoteBackgroundSide = null,
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

  // 背景の左右情報に基づいて参加者を並び替え
  const sortedParticipants = [...participants].sort((a, b) => {
    if (participants.length === 2 && myBackgroundSide && remoteBackgroundSide) {
      // 2人の場合、背景の左右に基づいて並び替え
      const isALocal = a.id === "local";
      const isBLocal = b.id === "local";

      if (isALocal && !isBLocal) {
        // 自分が左側の背景を使っている場合は自分を左に
        return myBackgroundSide === "left" ? -1 : 1;
      } else if (!isALocal && isBLocal) {
        // 相手が左側の背景を使っている場合は相手を左に
        return remoteBackgroundSide === "left" ? -1 : 1;
      }
    }
    // デフォルトはlocalを左に
    if (a.id === "local") return -1;
    if (b.id === "local") return 1;
    return 0;
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100"
    >
      <div
        className="w-full h-full grid p-4 box-border"
        style={{
          gridTemplateColumns:
            participants.length <= 2
              ? `repeat(${participants.length}, 1fr)`
              : "repeat(2, 1fr)",
          gridTemplateRows: participants.length > 2 ? "repeat(2, 1fr)" : "1fr",
        }}
      >
        {sortedParticipants.map((participant) => (
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
