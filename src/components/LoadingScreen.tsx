import ZLoader from '@/components/ZLoader';

export default function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
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