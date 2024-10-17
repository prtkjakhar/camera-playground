import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import {removeBackground} from '@imgly/background-removal';

const FaceDetection: React.FC = () => {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [matchingScore, setMatchingScore] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      startVideo();
    };
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error(err));
  };

  const onPlay = async () => {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 128,
      scoreThreshold: 0.5,
    });
    const result = await faceapi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    // Clear the canvas before drawing
    const ctx = canvasRef.current!.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
    if (result) {
      // Draw the detection box
      const dims = faceapi.matchDimensions(
        canvasRef.current!,
        videoRef.current,
        true
      );
      const resizedResult = faceapi.resizeResults(result, dims);
      faceapi.draw.drawDetections(canvasRef.current!, resizedResult);

      const confidenceScore = result.detection.score; // Extract confidence score
      setMatchingScore(confidenceScore);
    }
    setTimeout(onPlay, 50);
  };

  const captureImage = async () => {
    const canvas = canvasRef.current;
    if (canvas && videoRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Capture image data from canvas
        const imageData = canvas.toDataURL('image/jpeg');

        setLoading(true);
        setImageUrl(null);
        try {
          const blob = await removeBackground(imageData);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } catch (error) {
          console.error("Error removing background:", error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    console.log(imageUrl)
  }, [imageUrl])
  

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100dvw',
        margin: 'auto',
        textAlign: 'center',
      }}>
      <video
        ref={videoRef}
        onPlay={onPlay}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '100dvw'
        }}
        width="640"
        height="480"
        autoPlay
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '100dvw'
        }}
        width="640"
        height="480"
      />
      <div
        style={{
          position: 'absolute',
          top: '500px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
        <Button onClick={captureImage} disabled={matchingScore < 0.75 || loading}>
          Capture Photo
        </Button>
      </div>
      {loading && (
        <div style={{ position: 'absolute', top: '550px', left: '50%', transform: 'translateX(-50%)' }}>
          <h3>Removing background...</h3>
          <div className="loader"></div> 
        </div>
      )}
        {imageUrl && (
        <div style={{ position: 'absolute', top: '650px', left: '50%', width: '100%', transform: 'translateX(-50%)'}}>
          <h3>Processed Image</h3>
          <img src={imageUrl} alt="Background Removed" style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default FaceDetection;
