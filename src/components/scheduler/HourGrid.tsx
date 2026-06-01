type Props = {
  rowHeight: number;
};

export default function HourGrid({rowHeight}: Props) {
  return (
    <>
      {Array.from({length: 24}, (_, hour) => (
        <div key={hour} className="border-t border-black/[0.05]" style={{height: rowHeight}}>
          <div className="mt-[30px] border-t border-dashed border-black/[0.03]" />
        </div>
      ))}
    </>
  );
}
