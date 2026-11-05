import Image from 'next/image';

// A small 3:4 preview in admin lists (suits, collections), or a "No photo" box. Decorative: the
// row's link already names the record.
export function Thumb({ src }: { src: string | null }) {
  return src ? (
    <Image
      src={src}
      alt=""
      width={45}
      height={60}
      unoptimized
      className="aspect-[3/4] w-12 shrink-0 rounded-sm bg-border object-cover"
    />
  ) : (
    <span className="flex aspect-[3/4] w-12 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-center text-label text-muted">
      No photo
    </span>
  );
}
