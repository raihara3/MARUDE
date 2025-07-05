import { useEffect, useRef, useState, useCallback } from "react";
import Daily from "@daily-co/daily-js";
import { VideoControls } from "./VideoControls";
import { ParticipantsList } from "./ParticipantsList";
import { CompositeVideoView } from "./CompositeVideoView";
import { BackgroundSelector } from "./BackgroundSelector";
import type { Background } from "../types";

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
  const [selectedBackground, setSelectedBackground] =
    useState<Background | null>(null);
  const [myBackgroundSide, setMyBackgroundSide] = useState<
    "left" | "right" | null
  >(null);
  const [remoteBackgroundSide, setRemoteBackgroundSide] = useState<
    "left" | "right" | null
  >(null);

  const updateParticipantStreams = useCallback(() => {
    if (!callRef.current) return;

    const currentParticipants = callRef.current.participants();
    const streams: ParticipantWithStream[] = [];

    // 全ての参加者（ローカルとリモート）を処理
    for (const [id, participant] of Object.entries(currentParticipants)) {
      const p = participant as any;
      if (p.video && p.videoTrack) {
        const stream = new MediaStream([p.videoTrack]);

        // オーディオトラックも追加（ある場合）
        if (p.audio && p.audioTrack) {
          stream.addTrack(p.audioTrack);
        }

        streams.push({
          id,
          name: p.user_name || (id === "local" ? "あなた" : "ゲスト"),
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

        // 背景変更メッセージを受信
        callRef.current.on("app-message", (event: any) => {
          if (event.data.type === "background-change") {
            // 他の参加者が変更した背景を適用（broadcastなしで）
            handleBackgroundChange(event.data.background, false);
          } else if (event.data.type === "background-sync-request") {
            // 新規参加者から同期リクエストを受信したら現在の背景と左右情報を送信
            if (selectedBackground) {
              callRef.current.sendAppMessage({
                type: "background-sync-response",
                background: selectedBackground,
                backgroundSide: myBackgroundSide,
                to: event.fromId,
              });
            }
          } else if (event.data.type === "background-sync-response") {
            // 背景同期レスポンスを受信したら適用
            handleBackgroundChange(event.data.background, false);
            if (event.data.backgroundSide) {
              setRemoteBackgroundSide(event.data.backgroundSide);
            }
          } else if (event.data.type === "background-side-update") {
            // 背景の左右情報を受信
            setRemoteBackgroundSide(event.data.side);
            
            // 2人目として参加した場合、自動的に右側を使用
            const currentCount = Object.keys(
              callRef.current?.participants() || {}
            ).length;
            
            if (currentCount === 2 && event.data.side === 'left' && !myBackgroundSide) {
              // 相手が左側を使用している場合、自分は右側を使用
              setMyBackgroundSide('right');
              
              // 背景を再適用（右側）（遅延を入れて確実に処理されるようにする）
              if (selectedBackground) {
                setTimeout(() => {
                  handleBackgroundChange(selectedBackground, false);
                }, 500);
              }
              
              // 相手に自分が右側を使用していることを通知
              setTimeout(() => {
                callRef.current?.sendAppMessage({
                  type: "background-side-update",
                  side: 'right'
                });
              }, 100);
            }
          }
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

          // 2人になった時点で背景を自動的に再適用
          if (currentCount === 2 && !myBackgroundSide) {
            console.log('First participant detected, switching to left side background');
            
            // 自分が最初の参加者の場合、左側を使用することを決定
            setMyBackgroundSide('left');
            
            // 背景を再適用（遅延を入れて確実に2人の状態で処理されるようにする）
            if (selectedBackground) {
              setTimeout(() => {
                handleBackgroundChange(selectedBackground, false);
              }, 1000);
            }
            
            // 相手に自分が左側を使用していることを通知
            setTimeout(() => {
              callRef.current?.sendAppMessage({
                type: "background-side-update",
                side: 'left'
              });
            }, 500);
          }
        });

        callRef.current.on("participant-updated", () => {
          updateParticipants();
          updateParticipantStreams();
        });

        callRef.current.on("participant-left", () => {
          updateParticipants();
          updateParticipantStreams();

          // リモートの背景情報をリセット
          setRemoteBackgroundSide(null);

          // 参加者数変更時に背景を再適用
          if (selectedBackground) {
            handleBackgroundChange(selectedBackground, false);
          }
        });

        await callRef.current.join({
          url: roomUrl,
          userName: userName,
        });

        // 参加完了後、既存の参加者に背景同期をリクエスト
        setTimeout(() => {
          callRef.current?.sendAppMessage({
            type: "background-sync-request",
          });
        }, 2000);
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

  const handleBackgroundChange = async (
    background: Background | null,
    broadcast: boolean = true
  ) => {
    setSelectedBackground(background);

    if (!callRef.current) return;

    try {
      if (background) {
        // 参加者数を取得
        const currentParticipants = callRef.current.participants();
        const participantCount = Object.keys(currentParticipants).length;

        // 参加者数に応じて背景を調整
        let backgroundUrl = background.url;

        console.log('handleBackgroundChange:', {
          participantCount,
          myBackgroundSide,
          remoteBackgroundSide
        });

        if (participantCount === 2) {
          // 2人の場合は左右分割背景を生成
          backgroundUrl = await createSplitBackground(background.url);
        }

        // 背景画像を設定
        if (participantCount === 2) {
          // 2人の場合はdata URLを使用
          await callRef.current.updateInputSettings({
            video: {
              processor: {
                type: "background-image",
                config: {
                  source: backgroundUrl,
                },
              },
            },
          });
        } else {
          // 1人または3人以上の場合は通常の背景画像を使用
          await callRef.current.updateInputSettings({
            video: {
              processor: {
                type: "background-image",
                config: {
                  source: window.location.origin + background.url,
                },
              },
            },
          });
        }

        // 他の参加者に背景変更を通知
        if (broadcast) {
          await callRef.current.sendAppMessage({
            type: "background-change",
            background: {
              id: background.id,
              name: background.name,
              url: background.url,
              thumbnail: background.thumbnail,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to update background:", error);
    }
  };

  // 2人用の左右分割背景を生成する関数
  const createSplitBackground = async (
    originalUrl: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // キャンバスサイズを背景画像と同じに設定
        canvas.width = img.width;
        canvas.height = img.height;

        // 背景の左右を決定
        let useLeftSide: boolean;

        if (myBackgroundSide) {
          // すでに左右が決定している場合はそれを使用
          useLeftSide = myBackgroundSide === 'left';
        } else if (remoteBackgroundSide === null) {
          // 相手がいない、または情報がまだない場合は左側を使用
          useLeftSide = true;
          setMyBackgroundSide('left');
        } else {
          // 相手が左側を使っている場合、自分は右側を使用
          useLeftSide = remoteBackgroundSide === "right";
          setMyBackgroundSide(useLeftSide ? 'left' : 'right');
        }

        // 他の参加者に自分の背景側を通知（初回のみ）
        if (!myBackgroundSide) {
          setTimeout(() => {
            callRef.current?.sendAppMessage({
              type: "background-side-update",
              side: useLeftSide ? 'left' : 'right',
            });
          }, 100);
        }

        console.log("Background split debug:", {
          myBackgroundSide,
          remoteBackgroundSide,
          useLeftSide,
        });

        if (useLeftSide) {
          // 左側の背景を使用
          ctx.drawImage(
            img,
            0,
            0,
            img.width / 2,
            img.height, // ソース：左半分
            0,
            0,
            canvas.width,
            canvas.height // 描画先：全体
          );
        } else {
          // 右側の背景を使用
          ctx.drawImage(
            img,
            img.width / 2,
            0,
            img.width / 2,
            img.height, // ソース：右半分
            0,
            0,
            canvas.width,
            canvas.height // 描画先：全体
          );
        }

        // データURLとして返す
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error("Failed to load background image"));
      };

      img.src = originalUrl.startsWith("/")
        ? window.location.origin + originalUrl
        : originalUrl;
    });
  };

  // living-room.jpgを初期背景として設定 & 参加時の背景同期
  useEffect(() => {
    if (callRef.current && !isLoading) {
      if (!selectedBackground) {
        // デフォルト背景を設定
        const livingRoomBackground: Background = {
          id: "living-room",
          name: "リビングルーム",
          url: "/backgrounds/living-room.jpg",
          thumbnail: "/backgrounds/living-room-thumb.jpg",
        };
        handleBackgroundChange(livingRoomBackground, false);

        // 既存参加者に背景同期をリクエスト
        setTimeout(() => {
          callRef.current?.sendAppMessage({
            type: "background-sync-request",
          });
        }, 1000);
      }
    }
  }, [isLoading]);

  // 参加者数の変化を監視して背景を更新
  useEffect(() => {
    if (selectedBackground && participants.length === 2 && myBackgroundSide) {
      console.log('Participant count changed to 2, updating background');
      handleBackgroundChange(selectedBackground, false);
    }
  }, [participants.length, myBackgroundSide]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 box-border">
      <div className="flex-1 relative mb-4">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <CompositeVideoView
            participants={participantStreams}
            myBackgroundSide={myBackgroundSide}
            remoteBackgroundSide={remoteBackgroundSide}
          />
          <BackgroundSelector
            selectedBackground={selectedBackground}
            onSelectBackground={handleBackgroundChange}
          />

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
