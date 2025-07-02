import { useEffect, useRef, useState, useCallback } from "react";
import Daily from "@daily-co/daily-js";
import { VideoControls } from "./VideoControls";
import { ParticipantsList } from "./ParticipantsList";
import { CompositeVideoView } from "./CompositeVideoView";

interface VideoRoomProps {
  roomUrl: string;
  userName: string;
  onLeave: () => void;
}

interface ParticipantWithStream {
  id: string;
  name: string;
  stream: MediaStream | null;
}

export function VideoRoom({ roomUrl, userName, onLeave }: VideoRoomProps) {
  const callRef = useRef<any | null>(null);
  const isInitializedRef = useRef(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantStreams, setParticipantStreams] = useState<
    ParticipantWithStream[]
  >([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const updateParticipantStreams = useCallback(() => {
    if (!callRef.current) return;

    const currentParticipants = callRef.current.participants();
    const streams: ParticipantWithStream[] = [];

    // 全ての参加者（ローカルとリモート）を処理
    for (const [id, participant] of Object.entries(currentParticipants)) {
      if (participant.video && participant.videoTrack) {
        const stream = new MediaStream([participant.videoTrack]);

        // オーディオトラックも追加（ある場合）
        if (participant.audio && participant.audioTrack) {
          stream.addTrack(participant.audioTrack);
        }

        streams.push({
          id,
          name: participant.user_name || (id === "local" ? "あなた" : "ゲスト"),
          stream,
        });
      }
    }

    console.log("Updated streams:", streams); // デバッグ用
    setParticipantStreams(streams);
  }, []);

  useEffect(() => {
    const initializeCall = async () => {
      // 既に初期化されている場合はスキップ
      if (isInitializedRef.current || callRef.current) return;

      try {
        isInitializedRef.current = true;
        callRef.current = Daily.createCallObject({
          subscribeToTracksAutomatically: true,
        });

        callRef.current.on("joined-meeting", () => {
          setIsLoading(false);
          updateParticipants();
          // 少し遅延してからストリームを更新
          setTimeout(updateParticipantStreams, 1000);
        });

        callRef.current.on("participant-joined", () => {
          updateParticipants();
          updateParticipantStreams();

          // 5人制限のチェック
          const currentCount = Object.keys(
            callRef.current?.participants() || {}
          ).length;
          if (currentCount > 5) {
            alert("このルームは満員です（最大5人）");
            handleLeave();
          }
        });

        callRef.current.on("participant-updated", () => {
          updateParticipants();
          updateParticipantStreams();
        });

        callRef.current.on("participant-left", () => {
          updateParticipants();
          updateParticipantStreams();
        });

        await callRef.current.join({
          url: roomUrl,
          userName: userName,
        });
      } catch (error) {
        console.error("Error joining call:", error);
        alert("通話への参加に失敗しました。");
        onLeave();
      }
    };

    const updateParticipants = () => {
      if (!callRef.current) return;
      const participants = callRef.current.participants();
      setParticipants(Object.values(participants));
    };

    initializeCall();

    return () => {
      if (callRef.current) {
        try {
          callRef.current.leave();
          callRef.current.destroy();
          callRef.current = null;
        } catch (error) {
          console.error("Error cleaning up call:", error);
        }
      }
      isInitializedRef.current = false;
    };
  }, [roomUrl, userName, onLeave]);

  const toggleVideo = () => {
    if (!callRef.current) return;
    const newState = !isVideoEnabled;
    callRef.current.setLocalVideo(newState);
    setIsVideoEnabled(newState);
    updateParticipantStreams();
  };

  const toggleAudio = () => {
    if (!callRef.current) return;
    const newState = !isAudioEnabled;
    callRef.current.setLocalAudio(newState);
    setIsAudioEnabled(newState);
  };

  const handleLeave = () => {
    if (callRef.current) {
      callRef.current.leave();
    }
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 box-border">
      <div className="flex-1 relative mb-4">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <CompositeVideoView participants={participantStreams} />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="text-center">
                <div className="animate-pulse text-orange-400 text-xl mb-2">
                  準備中...
                </div>
                <p className="text-gray-600">まもなく始まります</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <ParticipantsList participants={participants} />

          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onLeave={handleLeave}
          />
        </div>
      </div>
    </div>
  );
}
