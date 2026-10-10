import Image from "next/image";
export default function Brand({ full = false }: { full?: boolean }) {
  return (
    <div className={`hegb-brand ${full ? "hegb-brand-full" : ""}`}>
      <Image src="/brand/hegb-mark.svg" alt="" width={48} height={48} />
      <div>
        <strong>
          Censo Hospitalario <span>HEGB</span>
        </strong>
        <small>
          {full
            ? "Hospital Regional Eleazar Guzmán Barrón"
            : "Eleazar Guzmán Barrón"}
        </small>
      </div>
    </div>
  );
}
