document.addEventListener('DOMContentLoaded', () => {

    // range
    const ranges = document.querySelectorAll('.catalog_filter__range');
    if (!ranges.length) return;

    const ruler = document.createElement('span');
    ruler.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:pre;visibility:hidden;';
    document.body.appendChild(ruler);

    let sized = false;

    const measure = (el, text) => {
        const cs = getComputedStyle(el);
        ruler.style.font = cs.font;
        ruler.style.letterSpacing = cs.letterSpacing;
        ruler.style.fontVariantNumeric = cs.fontVariantNumeric;
        ruler.textContent = text;

        const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
            + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

        return Math.ceil(ruler.getBoundingClientRect().width) + extra + 2;
    };

    const fit = (el) => {
        if (!sized) return;
        el.style.width = measure(el, el.value || el.placeholder || '0') + 'px';
    };

    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const inited = [];

    ranges.forEach((root) => {
        const sMin = root.querySelector('.range_slider__input--min');
        const sMax = root.querySelector('.range_slider__input--max');
        const [fMin, fMax] = root.querySelectorAll('input[type="number"]');
        if (!sMin || !sMax || !fMin || !fMax) return;

        const MIN = +sMin.min;
        const MAX = +sMin.max;
        const STEP = +sMin.step || 1;
        const DEC = (String(sMin.step).split('.')[1] || '').length;

        [fMin, fMax].forEach((el) => {
            el.min = MIN; el.max = MAX; el.step = STEP;
        });

        const apply = (value, isMin) => {
            let v = clamp(isNaN(value) ? (isMin ? MIN : MAX) : value, MIN, MAX);
            v = isMin ? Math.min(v, +sMax.value) : Math.max(v, +sMin.value);
            v = v.toFixed(DEC);

            (isMin ? sMin : sMax).value = v;
            (isMin ? fMin : fMax).value = v;

            fit(fMin);
            fit(fMax);
        };

        const fieldMin = fMin.closest('.range_field');
        const fieldMax = fMax.closest('.range_field');

        const lock = () => {
            if (!sized || !fieldMin || !fieldMax) return;

            const longest = MAX.toFixed(DEC);
            let width = 0;

            [[fieldMin, fMin], [fieldMax, fMax]].forEach(([field, el]) => {
                field.style.width = '';
                const chrome = field.getBoundingClientRect().width - el.getBoundingClientRect().width;
                width = Math.max(width, measure(el, longest) + chrome);
            });

            width = Math.ceil(width);
            fieldMin.style.width = width + 'px';
            fieldMax.style.width = width + 'px';
        };

        root._lock = lock;

        sMin.addEventListener('input', () => apply(+sMin.value, true));
        sMax.addEventListener('input', () => apply(+sMax.value, false));

        fMin.addEventListener('input', () => fit(fMin));
        fMax.addEventListener('input', () => fit(fMax));
        fMin.addEventListener('change', () => apply(parseFloat(fMin.value), true));
        fMax.addEventListener('change', () => apply(parseFloat(fMax.value), false));

        apply(+fMin.value, true);
        apply(+fMax.value, false);

        inited.push({ fMin, fMax, lock });
    });

    if (!inited.length) return;

    const applySizes = () => {
        if (sized) return;
        sized = true;
        inited.forEach(({ fMin, fMax }) => { fit(fMin); fit(fMax); });
        inited.forEach(({ lock }) => lock());
    };

    if (document.fonts && document.fonts.ready) {
        Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 1500))
        ]).then(applySizes);
    } else {
        applySizes();
    }


    // select

    document.querySelectorAll('.catalog_filter__select').forEach((select) => {
        const button = select.querySelector('.select__button');
        const value = select.querySelector('.select__value');
        const options = select.querySelectorAll('.select__option');
        const nativeSelect = select.querySelector('.select__native');

        button.addEventListener('click', () => {
            select.classList.toggle('is-open');
            button.setAttribute(
                'aria-expanded',
                select.classList.contains('is-open')
            );
        });

        options.forEach((option) => {
            option.addEventListener('click', () => {
                value.textContent = option.textContent.trim();
                nativeSelect.value = option.dataset.value;

                options.forEach((item) => {
                    item.setAttribute('aria-selected', 'false');
                });

                option.setAttribute('aria-selected', 'true');

                select.classList.remove('is-open');
                button.setAttribute('aria-expanded', 'false');

                nativeSelect.dispatchEvent(new Event('change', {
                    bubbles: true
                }));
            });
        });
    });

    document.addEventListener('click', (event) => {
        document.querySelectorAll('.select.is-open').forEach((select) => {
            if (!select.contains(event.target)) {
                select.classList.remove('is-open');

                select
                    .querySelector('.select__button')
                    .setAttribute('aria-expanded', 'false');
            }
        });
    });
});