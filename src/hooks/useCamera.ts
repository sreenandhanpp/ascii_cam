import { useEffect, useMemo, useState } from 'react';

export function useCamera() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const constraints = useMemo(
    () =>
      deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: facing } },
    [deviceId, facing],
  );

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((d) => setDevices(d.filter((x) => x.kind === 'videoinput')));
  }, []);

  useEffect(() => {
    let active = true;
    let nextStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        nextStream = s;
        setStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return s;
        });
        setError('');
      })
      .catch((e) => setError(String(e)));

    return () => {
      active = false;
      nextStream?.getTracks().forEach((t) => t.stop());
    };
  }, [constraints]);

  return { devices, deviceId, setDeviceId, facing, setFacing, error, stream };
}
