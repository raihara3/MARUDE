import { useState, type FormEvent } from "react";

interface WelcomeScreenProps {
  onJoinRoom: (name: string, roomUrl: string) => void;
}

export function WelcomeScreen({ onJoinRoom }: WelcomeScreenProps) {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const handleJoinExisting = async (e: FormEvent) => {
    e.preventDefault();

    if (!userName.trim() || !roomCode.trim()) {
      alert("お名前とルームコードを入力してください");
      return;
    }

    const roomUrl = `https://${
      import.meta.env.VITE_DAILY_DOMAIN
    }.daily.co/${roomCode}`;
    onJoinRoom(userName, roomUrl);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* First View - Hero + Join Form */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16"
            style={{
              backgroundImage: "url('/symbol.png')",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "left top",
            }}
          >
            {/* Left: Hero Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl font-bold mb-6 text-gray-800">MARUDE</h1>
              <p className="text-xl text-gray-600 mb-8">
                まるで、一緒にいるみたい。
              </p>
              <p className="text-lg text-gray-500 mb-12">
                1つのバーチャル背景に全員を合成することで、まるで同じ空間にいるような体験ができるビデオ通話サービスです。
              </p>
              <a
                href="https://forms.gle/wjvnzpWo43gdnr137"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors no-underline"
              >
                ルームコードを発行する
              </a>
            </div>

            {/* Right: Join Form */}
            <div className="flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 w-full max-w-sm">
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
                  ルームへ参加
                </h2>
                <form onSubmit={handleJoinExisting} className="space-y-6">
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
                    className="w-full text-gray-800 font-bold block mt-4 py-5 px-4 rounded-lg transition-colors text-base border-none bg-orange-100 hover:bg-orange-200 cursor-pointer"
                  >
                    入室
                  </button>
                  <small className="text-gray-500 text-xs">
                    お試し用コード「test_room」
                    <br />
                    ※他の方が入室している可能性があります
                  </small>
                </form>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
              サービス画面
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <img
                  src="/screen.png"
                  alt="リビングルーム背景での2人の会議"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h3 className="text-lg font-semibold mb-2">背景の共有</h3>
                <p className="text-gray-600">
                  同じバーチャル背景を使用することで、まるで同じ空間にいるような体験ができます。
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <img
                  src="/backgrounds/office.jpg"
                  alt="オフィス背景での会議"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h3 className="text-lg font-semibold mb-2">多彩な背景</h3>
                <p className="text-gray-600">
                  リビング、オフィス、カフェなど、様々な背景から選択できます。
                </p>
              </div>
            </div>
            <p className="text-xl text-gray-600 mb-8 text-center mt-12">
              PCからの参加を推奨しています。
              <br />
              通話機能は
              <a href="https://daily.co/" target="_blank">
                Daily.co
              </a>
              を使用しています。
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm">© 2025 raihara3. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
