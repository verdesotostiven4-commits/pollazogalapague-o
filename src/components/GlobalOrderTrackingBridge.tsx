import PersistentTrackingCenter from './PersistentTrackingCenter';
import TrackingFloatingNoticeButton from './TrackingFloatingNoticeButton';

export default function GlobalOrderTrackingBridge() {
  return (
    <>
      <PersistentTrackingCenter />
      <TrackingFloatingNoticeButton />
    </>
  );
}
