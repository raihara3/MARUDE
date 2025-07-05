import { useEffect, useRef } from 'react';

interface VideoCanvasProps {
  stream: MediaStream | null;
  participantId: string;
}

export function VideoCanvas({ stream, participantId }: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // ビデオストリームの設定
  useEffect(() => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    video.srcObject = stream;
    
    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        // play()が中断された場合は無視（一般的な現象）
        if ((error as Error).name !== 'AbortError') {
          console.warn('Video play error:', error);
        }
      }
    };

    playVideo();

    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg"
        playsInline
        muted={participantId === 'local'}
      />
    </div>
  );
}