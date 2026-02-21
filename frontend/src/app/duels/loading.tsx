import ZLoader from '@/components/ZLoader';

export default function Loading() {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
      <ZLoader />
    </div>
  );
}
