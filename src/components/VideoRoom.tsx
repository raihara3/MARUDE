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
  const handleBackgroundChangeRef = useRef<any>(null);
  const updateParticipantStreamsRef = useRef<any>(null);
  const decideSidesFor2ParticipantsRef = useRef<any>(null);
  const myBackgroundSideRef = useRef<"left" | "right" | null>(null);
  const remoteBackgroundSideRef = useRef<"left" | "right" | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantStreams, setParticipantStreams] = useState<
    ParticipantWithStream[]
  >([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
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
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);

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

  // 2人用の左右分割背景を生成する関数
  const createSplitBackground = useCallback(
    async (originalUrl: string): Promise<string> => {
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

          // カメラ映像の縦横比（通常16:9）に合わせてキャンバスサイズを設定
          const videoAspectRatio = 16 / 9;
          const sourceWidth = img.width / 2; // 左右分割なので幅は半分
          const sourceHeight = img.height;

          // キャンバスサイズを決定（カメラ映像の縦横比に合わせる）
          if (sourceWidth / sourceHeight > videoAspectRatio) {
            // 背景の横幅が相対的に大きい場合：高さを基準にする
            canvas.height = sourceHeight;
            canvas.width = sourceHeight * videoAspectRatio;
          } else {
            // 背景の縦幅が相対的に大きい場合：幅を基準にする
            canvas.width = sourceWidth;
            canvas.height = sourceWidth / videoAspectRatio;
          }

          // 背景の左右を決定
          let useLeftSide: boolean;

          if (myBackgroundSideRef.current) {
            // すでに左右が決定している場合はそれを使用
            useLeftSide = myBackgroundSideRef.current === "left";
          } else {
            // まだ左右が決定されていない場合は、一時的に左側を使用
            // 実際の左右決定は後で行う
            useLeftSide = true;
          }

          // 他の参加者に自分の背景側を通知（初回のみ）
          if (!myBackgroundSide) {
            setTimeout(() => {
              callRef.current?.sendAppMessage({
                type: "background-side-update",
                side: useLeftSide ? "left" : "right",
              });
            }, 100);
          }

          console.log("Background split debug:", {
            myBackgroundSide: myBackgroundSideRef.current,
            remoteBackgroundSide: remoteBackgroundSideRef.current,
            useLeftSide,
            decision: myBackgroundSideRef.current ? "already set" : (remoteBackgroundSideRef.current === null ? "first participant" : `second participant (remote has ${remoteBackgroundSideRef.current})`),
            canvasSize: { width: canvas.width, height: canvas.height },
          });

          // 背景画像を下揃えで描画するための計算
          const backgroundScale = Math.max(
            canvas.width / sourceWidth,
            canvas.height / sourceHeight
          );

          const scaledWidth = sourceWidth * backgroundScale;
          const scaledHeight = sourceHeight * backgroundScale;

          // 下揃えのためのY座標計算
          const offsetX = (canvas.width - scaledWidth) / 2;
          const offsetY = canvas.height - scaledHeight; // 下揃えにする

          if (useLeftSide) {
            // 左側の背景を使用（下揃えで描画）
            ctx.drawImage(
              img,
              0, // 元画像の左端から
              0, // 元画像の上端から
              img.width / 2, // 元画像の幅の半分
              img.height, // 元画像の高さ全体
              offsetX, // 描画先X座標
              offsetY, // 描画先Y座標（下揃え）
              scaledWidth, // 描画先の幅
              scaledHeight // 描画先の高さ
            );
          } else {
            // 右側の背景を使用（下揃えで描画）
            ctx.drawImage(
              img,
              img.width / 2, // 元画像の中央から
              0, // 元画像の上端から
              img.width / 2, // 元画像の幅の半分
              img.height, // 元画像の高さ全体
              offsetX, // 描画先X座標
              offsetY, // 描画先Y座標（下揃え）
              scaledWidth, // 描画先の幅
              scaledHeight // 描画先の高さ
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
    },
    [myBackgroundSide, remoteBackgroundSide]
  );

  const handleBackgroundChange = useCallback(
    async (background: Background | null, broadcast: boolean = true) => {
      setSelectedBackground(background);

      if (!callRef.current) return;

      try {
        if (background) {
          // 参加者数を取得
          const currentParticipants = callRef.current.participants();
          const participantCount = Object.keys(currentParticipants).length;

          // 参加者数に応じて背景を調整
          let backgroundUrl = background.url;

          console.log("handleBackgroundChange:", {
            participantCount,
            myBackgroundSide,
            remoteBackgroundSide,
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

          // 背景が正常に適用されたことを確認
          setIsBackgroundReady(true);

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
        } else {
          // 背景を削除する場合
          await callRef.current.updateInputSettings({
            video: {
              processor: {
                type: "none",
              },
            },
          });
          setIsBackgroundReady(true);
        }
      } catch (error) {
        console.error("Failed to update background:", error);
        // エラーが発生しても映像を表示
        setIsBackgroundReady(true);
      }
    },
    [createSplitBackground]
  );

  // 2人の参加者が揃った時に左右を決定する関数
  const decideSidesFor2Participants = useCallback(() => {
    const currentParticipants = callRef.current?.participants();
    const participantCount = Object.keys(currentParticipants || {}).length;
    
    if (participantCount !== 2) return;
    
    console.log("Deciding sides for 2 participants:", {
      myCurrentSide: myBackgroundSideRef.current,
      remoteCurrentSide: remoteBackgroundSideRef.current
    });
    
    // 両方とも未設定の場合、または既に正しく設定されている場合
    if (!myBackgroundSideRef.current) {
      // 相手の情報がある場合
      if (remoteBackgroundSideRef.current) {
        if (remoteBackgroundSideRef.current === "left") {
          myBackgroundSideRef.current = "right";
          setMyBackgroundSide("right");
        } else {
          myBackgroundSideRef.current = "left";
          setMyBackgroundSide("left");
        }
      } else {
        // 相手の情報がない場合、自分が先に参加したので左側を選択
        myBackgroundSideRef.current = "left";
        setMyBackgroundSide("left");
        
        // 相手に通知
        setTimeout(() => {
          callRef.current?.sendAppMessage({
            type: "background-side-update",
            side: "left",
          });
        }, 100);
      }
      
      // 背景を再適用
      if (selectedBackground && handleBackgroundChangeRef.current) {
        setTimeout(() => {
          handleBackgroundChangeRef.current(selectedBackground, false);
        }, 500);
      }
    }
  }, [selectedBackground]);

  // 関数をrefに保存
  useEffect(() => {
    handleBackgroundChangeRef.current = handleBackgroundChange;
    updateParticipantStreamsRef.current = updateParticipantStreams;
    decideSidesFor2ParticipantsRef.current = decideSidesFor2Participants;
  }, [handleBackgroundChange, updateParticipantStreams, decideSidesFor2Participants]);

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

          // デフォルト背景を遅延設定（カメラが完全に初期化されるのを待つ）
          setTimeout(async () => {
            const livingRoomBackground: Background = {
              id: "living-room",
              name: "リビングルーム",
              url: "/backgrounds/living-room.jpg",
              thumbnail: "/backgrounds/living-room-thumb.jpg",
            };

            // handleBackgroundChange関数を使用して背景を設定
            if (handleBackgroundChangeRef.current) {
              await handleBackgroundChangeRef.current(
                livingRoomBackground,
                false
              );
              console.log("Setting initial background...");

              // 背景設定後にビデオを有効化
              if (callRef.current) {
                await callRef.current.setLocalVideo(true);
                setIsVideoEnabled(true);
              }
            }

            // ストリームを更新
            if (updateParticipantStreamsRef.current) {
              updateParticipantStreamsRef.current();
            }
          }, 1500); // カメラ初期化を待つため少し遅延
        });

        // 背景変更メッセージを受信
        callRef.current.on("app-message", (event: any) => {
          if (event.data.type === "background-change") {
            // 他の参加者が変更した背景を適用（broadcastなしで）
            if (handleBackgroundChangeRef.current) {
              handleBackgroundChangeRef.current(event.data.background, false);
            }
          } else if (event.data.type === "background-sync-request") {
            // 新規参加者から同期リクエストを受信したら現在の背景と左右情報を送信
            if (selectedBackground) {
              callRef.current.sendAppMessage({
                type: "background-sync-response",
                background: selectedBackground,
                backgroundSide: myBackgroundSideRef.current,
                to: event.fromId,
              });
            }
          } else if (event.data.type === "background-sync-response") {
            // 背景同期レスポンスを受信したら適用
            if (handleBackgroundChangeRef.current) {
              handleBackgroundChangeRef.current(event.data.background, false);
            }
            if (event.data.backgroundSide) {
              remoteBackgroundSideRef.current = event.data.backgroundSide;
              setRemoteBackgroundSide(event.data.backgroundSide);
            }
          } else if (event.data.type === "background-side-update") {
            // 背景の左右情報を受信
            console.log("Received background-side-update:", event.data.side);
            remoteBackgroundSideRef.current = event.data.side;
            setRemoteBackgroundSide(event.data.side);

            // 2人の時に左右を再決定
            const currentCount = Object.keys(
              callRef.current?.participants() || {}
            ).length;

            if (currentCount === 2) {
              setTimeout(() => {
                if (decideSidesFor2ParticipantsRef.current) {
                  decideSidesFor2ParticipantsRef.current();
                }
              }, 1000);
            }
          }
        });

        callRef.current.on("participant-joined", () => {
          updateParticipants();
          if (updateParticipantStreamsRef.current) {
            updateParticipantStreamsRef.current();
          }

          // 5人制限のチェック
          const currentCount = Object.keys(
            callRef.current?.participants() || {}
          ).length;
          if (currentCount > 5) {
            alert("このルームは満員です（最大5人）");
            handleLeave();
          }

          // 2人になった時点で左右を決定
          if (currentCount === 2) {
            console.log("2 participants detected, deciding sides");
            
            // 少し遅延してから左右を決定（映像が安定してから）
            setTimeout(() => {
              if (decideSidesFor2ParticipantsRef.current) {
                decideSidesFor2ParticipantsRef.current();
              }
            }, 2000);
          }
        });

        callRef.current.on("participant-updated", () => {
          updateParticipants();
          if (updateParticipantStreamsRef.current) {
            updateParticipantStreamsRef.current();
          }
        });

        callRef.current.on("participant-left", () => {
          updateParticipants();
          if (updateParticipantStreamsRef.current) {
            updateParticipantStreamsRef.current();
          }

          // 参加者数を確認
          const currentCount = Object.keys(
            callRef.current?.participants() || {}
          ).length;

          // リモートの背景情報をリセット
          remoteBackgroundSideRef.current = null;
          setRemoteBackgroundSide(null);

          // 1人になった場合は背景設定をリセット
          if (currentCount === 1) {
            console.log("Participant left, switching back to full background");
            myBackgroundSideRef.current = null;
            setMyBackgroundSide(null);

            // 1人用の背景に戻す（遅延を入れて確実に処理されるようにする）
            if (selectedBackground) {
              setTimeout(() => {
                if (handleBackgroundChangeRef.current) {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }
              }, 500);
            }
          }
        });

        // 最初はビデオを無効にして参加
        await callRef.current.join({
          url: roomUrl,
          userName: userName,
          startVideoOff: true,
        });

        // 参加完了後、既存の参加者に背景同期をリクエスト
        setTimeout(() => {
          callRef.current?.sendAppMessage({
            type: "background-sync-request",
          });
        }, 2500);
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
    if (updateParticipantStreamsRef.current) {
      updateParticipantStreamsRef.current();
    }
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

  // この行以降の関数定義は上部に移動済み

  // 参加時の背景同期
  useEffect(() => {
    if (callRef.current && !isLoading && isBackgroundReady) {
      // 既存参加者に背景同期をリクエスト
      setTimeout(() => {
        callRef.current?.sendAppMessage({
          type: "background-sync-request",
        });
      }, 1000);
    }
  }, [isLoading, isBackgroundReady]);

  // 参加者数の変化を監視して背景を更新
  useEffect(() => {
    if (selectedBackground && handleBackgroundChangeRef.current) {
      if (participants.length === 2 && myBackgroundSide) {
        console.log("Participant count changed to 2, updating background");
        handleBackgroundChangeRef.current(selectedBackground, false);
      } else if (participants.length === 1 && !myBackgroundSide) {
        console.log(
          "Participant count changed to 1, updating to full background"
        );
        handleBackgroundChangeRef.current(selectedBackground, false);
      }
    }
  }, [participants.length, myBackgroundSide, selectedBackground]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 box-border">
      <div className="flex-1 relative mb-4">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          {isBackgroundReady ? (
            <>
              <CompositeVideoView
                participants={participantStreams}
                myBackgroundSide={myBackgroundSide}
                remoteBackgroundSide={remoteBackgroundSide}
              />
              <BackgroundSelector
                selectedBackground={selectedBackground}
                onSelectBackground={handleBackgroundChange}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="text-center">
                <div className="animate-pulse text-orange-400 text-xl mb-2">
                  準備中...
                </div>
                <p className="text-gray-600">バーチャル背景を設定しています</p>
              </div>
            </div>
          )}

          {isLoading && !isBackgroundReady && (
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
