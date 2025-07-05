import { useEffect, useRef, useState } from 'react';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs';

export function useBodySegmentation() {
  const [isLoading, setIsLoading] = useState(true);
  const segmenterRef = useRef<bodySegmentation.BodySegmenter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const initializeSegmenter = async () => {
      try {
        // TensorFlow.jsの初期化を確認
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        console.log('TensorFlow.js backend:', tf.getBackend());
        console.log('Available backends:', tf.engine().backendNames);

        const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
        const segmenterConfig = {
          runtime: 'tfjs' as const,
          modelType: 'general' as const,
        };

        console.log('Loading segmentation model...');
        segmenterRef.current = await bodySegmentation.createSegmenter(model, segmenterConfig);
        console.log('Segmentation model loaded successfully');
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load segmentation model:', error);
        console.error('Error details:', {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack
        });
        setIsLoading(false);
      }
    };

    initializeSegmenter();

    return () => {
      if (segmenterRef.current) {
        segmenterRef.current.dispose();
      }
    };
  }, []);

  const segmentPerson = async (
    videoElement: HTMLVideoElement,
    outputCanvas: HTMLCanvasElement,
    backgroundImage?: HTMLImageElement
  ) => {
    try {
      if (!segmenterRef.current || !videoElement.videoWidth || videoElement.readyState < 2) {
        console.log('Segmentation skipped: not ready');
        return;
      }

      console.log('Starting segmentation...');
      const segmentation = await segmenterRef.current.segmentPeople(videoElement);
      
      if (segmentation.length === 0) {
        console.log('No people detected');
        return;
      }

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      // キャンバスのサイズを設定
      outputCanvas.width = videoElement.videoWidth;
      outputCanvas.height = videoElement.videoHeight;

      // 背景を描画
      if (backgroundImage) {
        // バーチャル背景を描画
        ctx.drawImage(backgroundImage, 0, 0, outputCanvas.width, outputCanvas.height);
      } else {
        // 透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      }

      // 人物のマスクを取得
      const mask = segmentation[0].mask;
      console.log('Segmentation result:', segmentation[0]);
      console.log('Mask object:', mask);
      console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
      console.log('Canvas dimensions:', outputCanvas.width, 'x', outputCanvas.height);
      
      // マスクをImageDataに変換
      const maskImageData = await mask.toImageData();
      console.log('Mask ImageData:', maskImageData.width, 'x', maskImageData.height);
      
      // 人物部分を抽出するためのキャンバスを作成
      const personCanvas = document.createElement('canvas');
      personCanvas.width = outputCanvas.width;
      personCanvas.height = outputCanvas.height;
      const personCtx = personCanvas.getContext('2d');
      
      if (personCtx) {
        // ビデオフレームを描画
        personCtx.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
        
        // マスクを適用して人物部分のみを残す
        const personImageData = personCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const personData = personImageData.data;
        const maskData = maskImageData.data;
        
        // マスクデータをキャンバスサイズにリサイズして適用
        for (let y = 0; y < outputCanvas.height; y++) {
          for (let x = 0; x < outputCanvas.width; x++) {
            // マスクの座標を計算（リサイズ）
            const maskX = Math.floor((x / outputCanvas.width) * maskImageData.width);
            const maskY = Math.floor((y / outputCanvas.height) * maskImageData.height);
            const maskIndex = (maskY * maskImageData.width + maskX) * 4;
            
            // キャンバスの座標を計算
            const pixelIndex = (y * outputCanvas.width + x) * 4;
            
            // マスク値を取得（0-255の範囲、RGBAのRチャンネルを使用）
            const maskValue = maskData[maskIndex];
            
            // アルファチャンネルを設定（人物部分は不透明、背景は透明）
            personData[pixelIndex + 3] = maskValue;
          }
        }
        
        personCtx.putImageData(personImageData, 0, 0);
        
        // 人物を背景の上に描画
        ctx.drawImage(personCanvas, 0, 0);
      }
      
      console.log('Segmentation completed');
    } catch (error) {
      console.warn('Segmentation error:', error);
      console.warn('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        videoReady: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight
      });
      // エラーが発生した場合は元のビデオを表示
      const ctx = outputCanvas.getContext('2d');
      if (ctx && videoElement.videoWidth) {
        outputCanvas.width = videoElement.videoWidth;
        outputCanvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
      }
    }
  };

  return {
    isLoading,
    segmentPerson,
    canvasRef,
  };
}