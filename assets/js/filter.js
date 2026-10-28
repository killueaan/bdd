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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('catalog-filter');
    const list = document.querySelector('.catalog_list');
    if (!form || !list) return;

    const cards = [...list.children].filter((el) => el.tagName === 'ARTICLE' && !el.classList.contains('promo_card'));
    cards.forEach((card, i) => { card.dataset.order = i; });

    const promo = list.querySelector('.promo_card');
    const countEl = document.querySelector('.catalog_count');
    const chipsBox = document.querySelector('.catalog_filter_chips');
    const emptyEl = document.querySelector('.catalog_empty');
    const PROMO_AFTER = 6; 

    const selects = [...form.querySelectorAll('.select__native[name]')];

    const ranges = [...form.querySelectorAll('.catalog_filter__range[id$="-range"]')]
        .map((root) => ({
            key: root.id.replace(/-range$/, ''),
            sMin: root.querySelector('.range_slider__input--min'),
            sMax: root.querySelector('.range_slider__input--max'),
            fields: root.querySelectorAll('input[type="number"]'),
            unit: root.querySelector('.range_field__unit')?.textContent.trim() || '',
        }))
        .filter((r) => r.sMin && r.sMax);

    const state = { direction: 'all', sort: 'popular' };

    const sortSelect = document.querySelector('.select__native[name="sort"]');
    const sortBtn = sortSelect ? null : document.querySelector('button.catalog_sort');
    let sortKey = 'year';
    let sortLabels = ['Сначала новые', 'Сначала старые'];

    if (sortSelect) {
        state.sort = sortSelect.value || 'popular';
    } else if (sortBtn) {
        sortKey = sortBtn.dataset.sortKey || sortKey;
        if (sortBtn.dataset.labels) sortLabels = sortBtn.dataset.labels.split('|');
        state.sort = `${sortKey}-desc`;
    }

    const getFilters = () => ({
        direction: state.direction,
        selects: selects.map((sel) => ({
            name: sel.name,
            value: sel.value,
            label: sel.selectedOptions[0]?.textContent.trim() || '',
        })),
        ranges: ranges.map((r) => ({
            key: r.key,
            lo: +r.sMin.value,
            hi: +r.sMax.value,
            label: `${r.fields[0]?.value ?? r.sMin.value}–${r.fields[1]?.value ?? r.sMax.value}${r.unit ? ' ' + r.unit : ''}`,
            active: +r.sMin.value > +r.sMin.min || +r.sMax.value < +r.sMax.max,
        })),
    });

    const matches = (card, f) => {
        if (f.direction !== 'all' && card.dataset.direction !== f.direction) return false;

        for (const s of f.selects) {
            if (s.value && card.dataset[s.name] !== s.value) return false;
        }
        for (const r of f.ranges) {
            if (!r.active) continue;
            const v = parseFloat(card.dataset[r.key]);
            if (isNaN(v) || v < r.lo || v > r.hi) return false;
        }
        return true;
    };

    const sortCards = (arr) => {
        const byOrder = (a, b) => a.dataset.order - b.dataset.order;
        if (state.sort === 'popular') return arr.sort(byOrder);

        const [key, dir] = state.sort.split('-');
        const k = dir === 'asc' ? 1 : -1;
        return arr.sort((a, b) =>
            ((parseFloat(a.dataset[key]) || 0) - (parseFloat(b.dataset[key]) || 0)) * k || byOrder(a, b));
    };

    // --- вывод ---
    const plural = (n, forms) => {
        const n10 = n % 10, n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return forms[0];
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
        return forms[2];
    };

    const renderChips = (f) => {
        if (!chipsBox) return;
        const chips = [
            ...f.selects.filter((s) => s.value).map((s) => ({ reset: `select:${s.name}`, label: s.label })),
            ...f.ranges.filter((r) => r.active).map((r) => ({ reset: `range:${r.key}`, label: r.label })),
        ];

        chipsBox.innerHTML = chips.map((c) =>
            `<button type="button" class="catalog_chip chip chip_filled buttons_medium_rc" data-reset="${c.reset}"
                aria-label="Убрать фильтр ${c.label}">${c.label}</button>`
        ).join('') + (chips.length
            ? '<button type="button" class="chip chip_outline buttons_medium_rc" data-reset="all">Сбросить все</button>'
            : '');

        chipsBox.hidden = !chips.length;
    };

    const render = () => {
        const f = getFilters();
        const visible = [];
        const hidden = [];

        cards.forEach((card) => {
            const ok = matches(card, f);
            card.hidden = !ok;
            (ok ? visible : hidden).push(card);
        });

        const order = sortCards(visible).slice();
        if (promo) order.splice(Math.min(PROMO_AFTER, visible.length), 0, promo);
        list.append(...order, ...hidden);

        const n = visible.length;
        if (countEl) countEl.textContent = `Найдено ${n} ${plural(n, ['проект', 'проекта', 'проектов'])}`;
        if (emptyEl) emptyEl.hidden = n > 0;

        renderChips(f);
    };

    let waitTimer, fadeTimer;
    const update = () => {
        clearTimeout(waitTimer);
        clearTimeout(fadeTimer);
        waitTimer = setTimeout(() => {
            list.classList.add('is-switching');
            fadeTimer = setTimeout(() => {
                render();
                list.classList.remove('is-switching');
            }, 200);
        }, 150);
    };

    const resetFilter = (what) => {
        const [type, name] = what.split(':');

        selects.forEach((sel) => {
            if (type !== 'all' && !(type === 'select' && sel.name === name)) return;
            sel.closest('.select')?.querySelector('.select__option[data-value=""]')?.click();
        });

        ranges.forEach((r) => {
            if (type !== 'all' && !(type === 'range' && r.key === name)) return;
            r.sMin.value = r.sMin.min;
            r.sMin.dispatchEvent(new Event('input', { bubbles: true }));
            r.sMax.value = r.sMax.max;
            r.sMax.dispatchEvent(new Event('input', { bubbles: true }));
        });

        update();
    };

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', (e) => e.preventDefault()); 

    chipsBox?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-reset]');
        if (btn) resetFilter(btn.dataset.reset);
    });

    sortSelect?.addEventListener('change', () => {
        state.sort = sortSelect.value || 'popular';
        update();
    });

    sortBtn?.addEventListener('click', () => {
        const asc = state.sort.endsWith('-desc');
        state.sort = `${sortKey}-${asc ? 'asc' : 'desc'}`;
        sortBtn.classList.toggle('is-asc', asc);
        const label = sortBtn.querySelector('.catalog_sort__label');
        if (label) label.textContent = asc ? sortLabels[1] : sortLabels[0];
        update();
    });

    const directions = document.querySelector('[data-directions]');

    if (directions) {
        const ruler = directions.querySelector('.directions_ruler');
        const btns = [...directions.querySelectorAll('.directions_btn')];
        const STEP = 30;        
        const TAPE_SPEED = 3;   
        let markerX = 0;
        let tapeSpin = 0;

        const activeBtn = () => directions.querySelector('.directions_btn.is-active');

        const centerOf = (el) => {
            const r = el.getBoundingClientRect();
            return r.left + r.width / 2 - ruler.getBoundingClientRect().left;
        };

        const moveTo = (btn, animate = true) => {
            const x = centerOf(btn);

            if (animate) {
                tapeSpin += Math.round((x - markerX) / STEP) * (TAPE_SPEED - 1) * STEP;
            }
            markerX = x;

            ruler.classList.toggle('no-anim', !animate);
            ruler.style.setProperty('--marker-x', x + 'px');
            ruler.style.setProperty('--tape-spin', tapeSpin + 'px');

            if (!animate) {
                ruler.offsetHeight;
                ruler.classList.remove('no-anim');
            }
        };

        btns.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('is-active')) return;

                btns.forEach((b) => {
                    const isActive = b === btn;
                    b.classList.toggle('is-active', isActive);
                    b.setAttribute('aria-selected', isActive);
                });

                moveTo(btn);
                state.direction = btn.dataset.direction;
                update();
            });
        });

        state.direction = activeBtn()?.dataset.direction || 'all';
        moveTo(activeBtn(), false);
        window.addEventListener('resize', () => moveTo(activeBtn(), false));
    }

    render(); 
});