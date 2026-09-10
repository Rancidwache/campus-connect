export default function Skeleton({ w = '100%', h = 14, r = 'var(--r-sm)', style }) {
  return <span className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />;
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="stack-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={11} w={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <Skeleton h={150} r={0} />
      <div className="stack-2" style={{ padding: 'var(--sp-4) var(--sp-5) var(--sp-5)' }}>
        <Skeleton h={16} w="75%" />
        <Skeleton h={11} w="45%" />
        <Skeleton h={11} />
        <Skeleton h={11} w="80%" />
        <div className="row-between" style={{ marginTop: 6 }}>
          <Skeleton h={16} w={70} />
          <Skeleton h={11} w={60} />
        </div>
      </div>
    </div>
  );
}
