export function Footer({ whatsapp }: { whatsapp?: string }) {
  const wa = whatsapp || "201000000000";
  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-sm font-black text-white">
              A
            </span>
            <span className="text-lg font-black text-primary-800">A.N.T.E</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            ملابس طبية باحترافية — اسكرابس وأفرولات قابلة للتخصيص بالشعار
            والاسم. جودة عالية وخامات مريحة.
          </p>
        </div>

        <div>
          <h4 className="font-extrabold text-ink-800">تواصل معنا</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <a
                className="inline-flex items-center gap-2 font-semibold text-primary-700 hover:underline"
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.96 9.96 0 1 0 12.04 2Zm5.9 14.07c-.25.7-1.45 1.34-2 1.38-.52.04-1.02.2-3.45-.72-2.92-1.1-4.77-3.98-4.91-4.16-.14-.18-1.17-1.56-1.17-2.98 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36h.55c.17 0 .41-.06.64.5.23.56.8 1.95.87 2.09.07.14.12.3.02.49-.1.18-.14.3-.29.46-.14.18-.3.4-.43.54-.14.14-.29.3-.13.58.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.18.7-.81.88-1.09.18-.28.37-.24.62-.14.26.1 1.65.78 1.93.92.28.14.47.2.54.32.07.11.07.66-.18 1.31Z" />
                </svg>
                واتساب
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-extrabold text-ink-800">روابط سريعة</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <a href="/products" className="hover:text-primary-700">كل المنتجات</a>
            </li>
            <li>
              <a href="/products?type=scrub-full" className="hover:text-primary-700">اسكراب كم طويل</a>
            </li>
            <li>
              <a href="/products?type=scrub-half" className="hover:text-primary-700">اسكراب كم قصير</a>
            </li>
            <li>
              <a href="/products?type=coat-men" className="hover:text-primary-700">أفرول رجالي</a>
            </li>
            <li>
              <a href="/products?type=coat-women" className="hover:text-primary-700">أفرول حريمي</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} A.N.T.E — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}