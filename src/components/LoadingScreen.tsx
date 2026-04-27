import ZLoader from '@/components/ZLoader';

export default function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100dvw',
        height: '100dvh',
        maxWidth: '100vw',
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
      }}
    >
      <ZLoader />
    </div>
  );
}