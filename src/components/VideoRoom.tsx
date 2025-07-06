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
  const myBackgroundSideRef = useRef<"left" | "right" | "center" | null>(null);
  const remoteBackgroundSideRef = useRef<"left" | "right" | "center" | null>(null);
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
    "left" | "right" | "center" | null
  >(null);
  const [remoteBackgroundSide, setRemoteBackgroundSide] = useState<
    "left" | "right" | "center" | null
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
    async (originalUrl: string, participantCount: number): Promise<string> => {
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
          const sourceWidth = participantCount === 2 ? img.width / 2 : img.width / 3; // 2人は半分、3人は三分の一
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

          // 背景の分割位置を決定
          let sourceX = 0;
          
          if (participantCount === 2) {
            // 2人の場合：左右分割
            if (myBackgroundSideRef.current === "right") {
              sourceX = img.width / 2;
            }
          } else if (participantCount === 3) {
            // 3人の場合：三分割
            if (myBackgroundSideRef.current === "center") {
              sourceX = img.width / 3;
            } else if (myBackgroundSideRef.current === "right") {
              sourceX = (img.width / 3) * 2;
            }
          }

          console.log("Background split debug:", {
            participantCount,
            myBackgroundSide: myBackgroundSideRef.current,
            remoteBackgroundSide: remoteBackgroundSideRef.current,
            sourceX,
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

          // 背景の分割部分を描画
          ctx.drawImage(
            img,
            sourceX, // 元画像の開始X座標
            0, // 元画像の上端から
            sourceWidth, // 元画像の幅
            img.height, // 元画像の高さ全体
            offsetX, // 描画先X座標
            offsetY, // 描画先Y座標（下揃え）
            scaledWidth, // 描画先の幅
            scaledHeight // 描画先の高さ
          );

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
    []
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
            myBackgroundSide: myBackgroundSideRef.current,
            remoteBackgroundSide: remoteBackgroundSideRef.current,
          });

          if (participantCount === 2 || participantCount === 3) {
            // 2人または3人の場合は分割背景を生成
            backgroundUrl = await createSplitBackground(background.url, participantCount);
          }

          // 背景画像を設定
          if (participantCount === 2 || participantCount === 3) {
            // 2人または3人の場合は分割背景のdata URLを使用
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
            // 1人または4人以上の場合は通常の背景画像を使用
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

  // 関数をrefに保存
  useEffect(() => {
    handleBackgroundChangeRef.current = handleBackgroundChange;
    updateParticipantStreamsRef.current = updateParticipantStreams;
  }, [handleBackgroundChange, updateParticipantStreams]);

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

          // 参加者情報の取得を少し遅延させる（Daily.coが参加者情報を更新するまで待つ）
          setTimeout(() => {
            const currentParticipants = callRef.current?.participants();
            const remoteParticipants = Object.keys(
              currentParticipants || {}
            ).filter((id) => id !== "local");
            const remoteParticipantCount = remoteParticipants.length;
            console.log(
              "Joined meeting (after delay), remote participant count:",
              remoteParticipantCount
            );
            console.log(
              "All participants:",
              Object.keys(currentParticipants || {})
            );

            // 自分の入室順を判定
            if (remoteParticipantCount === 1) {
              console.log("I'm the second participant, taking right side");
              myBackgroundSideRef.current = "right";
              setMyBackgroundSide("right");

              // 自分の側を通知
              setTimeout(() => {
                callRef.current?.sendAppMessage({
                  type: "background-side-update",
                  side: "right",
                });
              }, 200);

              // 背景を再適用（2人用の分割背景に）
              setTimeout(() => {
                if (selectedBackground && handleBackgroundChangeRef.current) {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }
              }, 1500);
            } else if (remoteParticipantCount === 2) {
              console.log("I'm the third participant, taking right side");
              myBackgroundSideRef.current = "right";
              setMyBackgroundSide("right");

              // 自分の側を通知
              setTimeout(() => {
                callRef.current?.sendAppMessage({
                  type: "background-side-update",
                  side: "right",
                });
              }, 200);

              // 背景を再適用（3人用の分割背景に）
              setTimeout(() => {
                if (selectedBackground && handleBackgroundChangeRef.current) {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }
              }, 1500);
            } else if (remoteParticipantCount === 0) {
              console.log(
                "I'm the first participant, will take left side when someone joins"
              );
            }
          }, 1000); // 1秒遅延で参加者情報を確認

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
              console.log(
                "Received remote side from sync response:",
                event.data.backgroundSide
              );
            }
          } else if (event.data.type === "background-side-update") {
            // 背景の左右情報を受信
            console.log("Received background-side-update:", event.data.side);
            remoteBackgroundSideRef.current = event.data.side;
            setRemoteBackgroundSide(event.data.side);

            // 相手が既に側を持っている場合、自分の側を決定
            if (!myBackgroundSideRef.current && event.data.side) {
              const participantCount = Object.keys(callRef.current?.participants() || {}).length;
              
              let mySide: "left" | "right" | "center";
              if (participantCount === 2) {
                mySide = event.data.side === "left" ? "right" : "left";
              } else if (participantCount === 3) {
                // 3人の場合：1人目=left, 2人目=center, 3人目=right
                // 既に誰かがleftを持っている場合、自分はcenterまたはrightになる
                if (event.data.side === "left") {
                  // 1人目がleftなら、自分は2人目または3人目
                  // 他の参加者の情報を確認して決定
                  mySide = "center"; // 2人目として扱う
                } else if (event.data.side === "center") {
                  // 2人目がcenterなら、自分は3人目
                  mySide = "right";
                } else {
                  // 3人目がrightなら、自分は1人目または2人目
                  mySide = "left"; // 1人目として扱う
                }
              } else {
                mySide = event.data.side === "left" ? "right" : "left";
              }
              
              myBackgroundSideRef.current = mySide;
              setMyBackgroundSide(mySide);
              console.log("Setting my side based on remote update:", mySide);

              // 背景を再適用（分割背景に）
              if (selectedBackground && handleBackgroundChangeRef.current) {
                setTimeout(() => {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }, 1500);
              }
            }
          } else if (event.data.type === "background-side-assignment") {
            // 背景の側を割り当てられた場合
            console.log("Received background-side-assignment:", event.data.targetSide);
            
            // 1人目（left）は変更しない
            if (myBackgroundSideRef.current === "left") {
              console.log("I'm the first participant (left), ignoring reassignment");
              return;
            }
            
            // 2人目のみ center に変更可能
            if (myBackgroundSideRef.current === "right" && event.data.targetSide === "center") {
              myBackgroundSideRef.current = event.data.targetSide;
              setMyBackgroundSide(event.data.targetSide);

              // 背景を再適用
              if (selectedBackground && handleBackgroundChangeRef.current) {
                setTimeout(() => {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }, 1500);
              }
            }
          } else if (event.data.type === "reorganize-positions") {
            // 3人になった時の再配置
            console.log("Received reorganize-positions");
            
            // 参加者リストを取得して順序を決定
            console.log("Current participants:", Object.keys(callRef.current?.participants() || {}));
            
            // 入室順序に基づいて位置を決定
            if (myBackgroundSideRef.current === "left") {
              // 1人目はleftのまま変更なし
              console.log("I'm first participant, staying left");
            } else if (myBackgroundSideRef.current === "right") {
              // 2人目だった場合はcenterに変更
              console.log("I was second participant, moving to center");
              myBackgroundSideRef.current = "center";
              setMyBackgroundSide("center");
              
              // 背景を再適用
              if (selectedBackground && handleBackgroundChangeRef.current) {
                setTimeout(() => {
                  handleBackgroundChangeRef.current(selectedBackground, false);
                }, 1500);
              }
            }
            // 3人目は自動的にrightになる（初期入室時の処理で）
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

          // 自分が最初にいて、新しい人が参加した場合
          const remoteCount = Object.keys(
            callRef.current?.participants() || {}
          ).filter((id) => id !== "local").length;

          if (remoteCount === 1 && !myBackgroundSideRef.current) {
            console.log("First remote participant joined, I take left side");
            myBackgroundSideRef.current = "left";
            setMyBackgroundSide("left");

            // 自分の側を通知
            setTimeout(() => {
              callRef.current?.sendAppMessage({
                type: "background-side-update",
                side: "left",
              });
            }, 200);

            // 背景を再適用（2人用の分割背景に）
            if (selectedBackground && handleBackgroundChangeRef.current) {
              setTimeout(() => {
                handleBackgroundChangeRef.current(selectedBackground, false);
              }, 1500);
            }
          } else if (remoteCount === 2 && myBackgroundSideRef.current === "left") {
            console.log("Third participant joined, reorganizing positions");
            
            // 全参加者の再配置を実行
            setTimeout(() => {
              callRef.current?.sendAppMessage({
                type: "reorganize-positions",
                positions: {
                  first: "left",    // 1人目は左
                  second: "center", // 2人目は中央
                  third: "right"    // 3人目は右
                }
              });
            }, 200);

            // 背景を再適用（3人用の分割背景に）
            if (selectedBackground && handleBackgroundChangeRef.current) {
              setTimeout(() => {
                handleBackgroundChangeRef.current(selectedBackground, false);
              }, 1500);
            }
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

  // 参加者数の変化を監視して背景を更新
  useEffect(() => {
    if (selectedBackground && handleBackgroundChangeRef.current) {
      if (participants.length === 2 && myBackgroundSide) {
        console.log("Participant count changed to 2, updating background");
        handleBackgroundChangeRef.current(selectedBackground, false);
      } else if (participants.length === 3 && myBackgroundSide) {
        console.log("Participant count changed to 3, updating background");
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
                selectedBackground={selectedBackground}
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
