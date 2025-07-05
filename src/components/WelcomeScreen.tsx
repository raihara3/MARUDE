import { useState, type FormEvent } from "react";

interface WelcomeScreenProps {
  onJoinRoom: (name: string, roomUrl: string) => void;
}

export function WelcomeScreen({ onJoinRoom }: WelcomeScreenProps) {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      alert("お名前を入力してください");
      return;
    }

    try {
      // Daily.coのルーム作成API（実際の実装では環境変数からAPIキーを取得）
      const response = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            max_participants: 5,
            enable_prejoin_ui: false,
            enable_knocking: false,
            enable_screenshare: false,
            enable_chat: false,
            enable_network_ui: false,
            enable_noise_cancellation_ui: false,
            exp: Math.round(Date.now() / 1000) + 3600, // 1時間後に期限切れ
            lang: "ja",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("ルームの作成に失敗しました");
      }

      const room = await response.json();
      onJoinRoom(userName, room.url);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("ルームの作成に失敗しました。もう一度お試しください。");
    } finally {
    }
  };

  const handleJoinExisting = async (e: FormEvent) => {
    e.preventDefault();

    if (!userName.trim() || !roomCode.trim()) {
      alert("お名前とルームコードを入力してください");
      return;
    }

    // Daily.coのルームURLを構築
    const roomUrl = `https://${
      import.meta.env.VITE_DAILY_DOMAIN
    }.daily.co/${roomCode}`;
    onJoinRoom(userName, roomUrl);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 w-4/12 max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          MARUDE
        </h1>
        <p className="text-center text-gray-600 mb-8">
          まるで、一緒にいるみたい。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ユーザー名
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-colors box-border"
              placeholder="ユーザー名を入力してください"
              maxLength={20}
            />
          </div>
        </form>

        <form onSubmit={handleJoinExisting} className="space-y-4 mt-3">
          <div>
            <label
              htmlFor="roomCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ルームコード
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-colors box-border"
              placeholder="ルームコードを入力"
            />
          </div>

          <button
            type="submit"
            className="w-full text-gray-800 font-bold block mt-4 py-5 px-4 rounded-lg transition-colors text-base border-none bg-orange-100"
          >
            ルームに参加
          </button>
        </form>
      </div>
    </div>
  );
}
