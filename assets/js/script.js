document.addEventListener('DOMContentLoaded', () => {

    // header
    const header = document.querySelector('.header');
    const hero = document.querySelector('.hero_section');

    if (header) {
        if (!hero) {
            header.classList.add('header_scrolled');
        }
        else {
            window.addEventListener('scroll', () => {
                if (window.scrollY >= hero.offsetHeight) {
                    header.classList.add('header_scrolled');
                } else {
                    header.classList.remove('header_scrolled');
                }
            })
        }
    }

    // footer
    const footer = document.querySelector('.footer_media');
    if (!footer || !window.gsap) return;

    const chips = [...footer.querySelectorAll('.footer_media__chip')];
    const arrowPaths = [...footer.querySelectorAll('.footer_media__arrow path')];

    const DROP = {
        chip_1: { x: -2, y: -590, rotation: -10, duration: 1.6 },  // Обсудить дом
        chip_2: { x: -4, y: -625, rotation: -26, duration: 1.9 },  // YouTube
        chip_3: { x: -3, y: -568, rotation: 35, duration: 1.4 },  // Telegram
        chip_4: { x: -24, y: -543, rotation: 0, duration: 1.7 },  // Max
    };
    const FALLBACK = { x: 0, y: -600, rotation: 0, duration: 1.5 };
    const STAGGER = 0.08;
    const getDrop = el => DROP[[...el.classList].find(c => DROP[c])] || FALLBACK;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 1280px) and (prefers-reduced-motion: no-preference)', () => {
        const baseRot = chips.map(el => gsap.getProperty(el, 'rotation'));
        const tl = gsap.timeline({ paused: true });
        let delayed = null;

        function reset() {
            chips.forEach((el, i) => {
                const d = getDrop(el);
                gsap.set(el, {
                    x: d.x,
                    y: d.y,
                    rotation: baseRot[i] + d.rotation,
                    willChange: 'transform',
                });
            });
            arrowPaths.forEach(p => {
                const len = p.getTotalLength();
                gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
            });
        }

        reset();

        chips.forEach((el, i) => {
            const d = getDrop(el);
            tl.to(el, {
                x: 0,
                y: 0,
                rotation: baseRot[i],
                duration: d.duration,
                ease: 'bounce.out',
            }, i * STAGGER);
        });

        const landed = Math.max(...chips.map((el, i) => i * STAGGER + getDrop(el).duration));
        arrowPaths.forEach((p, i) => {
            tl.to(p, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' }, landed + 0.1 + i * 0.15);
        });

        tl.eventCallback('onComplete', () => {
            gsap.set(chips, { clearProps: 'transform,willChange' }); // вернётся CSS-rotate
        });

        const playObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                delayed = gsap.delayedCall(0.3, () => tl.play());
            }
        }, { rootMargin: '0px 0px -30% 0px', threshold: 0 });

        const resetObserver = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
                delayed?.kill();
                delayed = null;
                tl.pause(0);
                reset();
            }
        }, { threshold: 0 });

        playObserver.observe(footer);
        resetObserver.observe(footer);

        return () => {
            delayed?.kill();
            playObserver.disconnect();
            resetObserver.disconnect();
            tl.kill();
            gsap.set(chips, { clearProps: 'transform,willChange' });
            gsap.set(arrowPaths, { clearProps: 'strokeDasharray,strokeDashoffset' });
        };
    });
})

// Мобильное меню
const burger = document.querySelector('.header_burger');

if (burger) {
    const headerEl = burger.closest('.header');

    const setMenu = (open) => {
        headerEl.classList.toggle('is-menu-open', open);
        burger.setAttribute('aria-expanded', open);
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', () => {
        setMenu(!headerEl.classList.contains('is-menu-open'));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });

    window.matchMedia('(min-width: 1201px)').addEventListener('change', (e) => {
        if (e.matches) setMenu(false);
    });
}

// services
document.querySelectorAll('.header_dropdown').forEach((dropdown) => {
    const toggle = dropdown.querySelector('.header_dropdown__toggle');
    const links = [...dropdown.querySelectorAll('.header_dropdown__link')];
    const media = dropdown.querySelector('.header_dropdown__media');

    const imgs = links.map((link) => {
        const img = new Image();
        img.src = link.dataset.img;
        img.alt = '';
        img.className = 'header_dropdown__img';
        media.append(img);
        return img;
    });

    const activate = (link) => {
        links.forEach((l, i) => {
            const on = l === link;
            l.classList.toggle('is-active', on);
            imgs[i].classList.toggle('is-active', on);
        });
    };

    activate(dropdown.querySelector('.header_dropdown__link.is-active') || links[0]);

    links.forEach((link) => {
        link.addEventListener('mouseenter', () => activate(link));
        link.addEventListener('focus', () => activate(link));
    });

    const setOpen = (open) => {
        dropdown.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open);
    };

    toggle.addEventListener('click', () => setOpen(!dropdown.classList.contains('is-open')));

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });
});
document.querySelectorAll('.field_select').forEach((field) => {
    const select = field.querySelector('.field_select__control');
    const text = field.querySelector('.field_select__text');
    if (!select || !text) return;

    const update = () => {
        text.textContent = select.options[select.selectedIndex].text;
    };

    select.addEventListener('change', update);
    select.form?.addEventListener('reset', () => setTimeout(update));
    update();
});


function initLoopSlider(selector, maxPerView, options) {
    const el = document.querySelector(selector);
    if (!el) return null;

    const wrapper = el.querySelector('.swiper-wrapper');
    const originals = Array.from(wrapper.children);

    if (originals.length > 1) {
        while (wrapper.children.length < maxPerView * 2) {
            originals.forEach((slide) => {
                const clone = slide.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.querySelectorAll('a, button').forEach((a) => a.setAttribute('tabindex', '-1'));
                wrapper.appendChild(clone);
            });
        }
    }

    return new Swiper(el, {
        loop: true,
        speed: 500,
        grabCursor: true,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },
        ...options,
    });
}
// portfolio
initLoopSlider('.portfolio_swiper', 3, {
    slidesPerView: 1.2,
    spaceBetween: 16,
    navigation: {
        prevEl: '.portfolio_arrow__prev',
        nextEl: '.portfolio_arrow__next',
    },
    breakpoints: {
        375: { slidesPerView: 1.1, spaceBetween: 18 },
        1101: { slidesPerView: 3, spaceBetween: 18 },
    },
});
// blog
initLoopSlider('.blog_swiper', 4, {
    slidesPerView: 1,
    spaceBetween: 16,
    navigation: {
        prevEl: '.blog_arrow__prev',
        nextEl: '.blog_arrow__next',
    },
    breakpoints: {
        375: { slidesPerView: 1.2 },
        1101: { slidesPerView: 4 },
    },
});

const heroSwiperEl = document.querySelector('.hero_swiper');

if (heroSwiperEl) {
    const progress = document.querySelector('.hero_progress');

    const setFills = (activeIndex) => {
        progress.querySelectorAll('.hero_progress__fill').forEach((fill, i) => {
            fill.style.transform = i < activeIndex ? 'scaleX(1)' : 'scaleX(0)';
        });
    };

    new Swiper(heroSwiperEl, {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        loop: true,
        speed: 500,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: progress,
            clickable: true,
            bulletClass: 'hero_progress__item',
            bulletActiveClass: 'is-active',
            renderBullet: (index, className) =>
                `<button type="button" class="${className}" aria-label="Слайд ${index + 1}"><span class="hero_progress__fill"></span></button>`,
        },
        on: {
            slideChange(swiper) {
                setFills(swiper.realIndex);
            },
            autoplayTimeLeft(swiper, timeLeft, percentage) {
                const fill = progress.querySelector('.is-active .hero_progress__fill');
                if (fill) fill.style.transform = `scaleX(${1 - percentage})`;
            },
        },
    });
}
// about
document.querySelectorAll('.project_about__body').forEach((body) => {
    const text = body.querySelector('.project_about__text');
    const btn = body.querySelector('.project_about__more');
    if (!text || !btn) return;

    const LINES = 3;

    const getCollapsedHeight = () => {
        const style = getComputedStyle(text);
        let lineHeight = parseFloat(style.lineHeight);
        if (isNaN(lineHeight)) lineHeight = parseFloat(style.fontSize) * 1.4;
        return Math.round(lineHeight * LINES);
    };

    let collapsed = getCollapsedHeight();

    if (text.scrollHeight <= collapsed + 1) {
        btn.hidden = true;
        text.style.webkitMaskImage = 'none';
        text.style.maskImage = 'none';
        return;
    }

    text.style.maxHeight = collapsed + 'px';

    btn.addEventListener('click', () => {
        const isOpen = body.classList.toggle('is-open');
        text.style.maxHeight = (isOpen ? text.scrollHeight : collapsed) + 'px';
        btn.textContent = isOpen ? 'Свернуть' : 'Читать ещё';
    });

    window.addEventListener('resize', () => {
        collapsed = getCollapsedHeight();
        const isOpen = body.classList.contains('is-open');
        text.style.maxHeight = (isOpen ? text.scrollHeight : collapsed) + 'px';
    });
});
// project_plan__image
if (document.querySelector('.project_plan__image')) {
    const planLightbox = new PhotoSwipeLightbox({
        gallery: '.project_plan__image',
        children: '.project_plan__link',
        pswpModule: PhotoSwipe,
        bgOpacity: 0.9,
        showHideAnimationType: 'zoom',
    });

    planLightbox.addFilter('domItemData', (itemData, element, linkEl) => {
        const img = linkEl.querySelector('img');
        if (img && img.naturalWidth) {
            itemData.width = img.naturalWidth;
            itemData.height = img.naturalHeight;
        }
        return itemData;
    });

    planLightbox.init();
}
// gallery
document.querySelectorAll('.project_gallery__slider').forEach((slider) => {
    const tabs = slider.querySelectorAll('.gallery_tabs__btn');
    const panels = slider.querySelectorAll('[data-gallery-panel]');
    const prevBtn = slider.querySelector('.project_gallery__prev');
    const nextBtn = slider.querySelector('.project_gallery__next');

    const baseOptions = {
        slidesPerView: 1,
        spaceBetween: 16,
        speed: 500,
        loop: true,
        grabCursor: true,
    };

    const attachDots = (swiper, dotsEl, total) => {
        if (!dotsEl) return;

        dotsEl.innerHTML = '';
        const dots = Array.from({ length: total }, (_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'project_gallery__dot';
            dot.setAttribute('aria-label', `Слайд ${i + 1}`);
            dot.addEventListener('click', () => swiper.slideToLoop(i));
            dotsEl.append(dot);
            return dot;
        });

        const update = () => {
            dots.forEach((dot, i) => dot.classList.toggle('is-active', i === swiper.realIndex));
        };

        swiper.on('slideChange', update);
        update();
    };

    if (!panels.length) {
        const swiperEl = slider.querySelector('.project_gallery__swiper');
        if (!swiperEl) return;

        const total = swiperEl.querySelectorAll('.swiper-slide').length;
        const swiper = new Swiper(swiperEl, {
            ...baseOptions,
            navigation: { prevEl: prevBtn, nextEl: nextBtn },
            pagination: {
                el: slider.querySelector('.project_gallery__counter'),
                type: 'fraction',
            },
        });
        attachDots(swiper, slider.querySelector('.project_gallery__dots'), total);
        return;
    }

    const swipers = {};

    panels.forEach((panel) => {
        const swiperEl = panel.querySelector('.project_gallery__swiper');
        const total = swiperEl.querySelectorAll('.swiper-slide').length;

        const swiper = new Swiper(swiperEl, {
            ...baseOptions,
            observer: true,
            observeParents: true,
            pagination: {
                el: panel.querySelector('.project_gallery__counter'),
                type: 'fraction',
            },
        });

        attachDots(swiper, panel.querySelector('.project_gallery__dots'), total);
        swipers[panel.dataset.galleryPanel] = swiper;
    });

    let active = slider.querySelector('.gallery_tabs__btn.is-active')?.dataset.gallery
        || panels[0].dataset.galleryPanel;

    prevBtn?.addEventListener('click', () => swipers[active].slidePrev());
    nextBtn?.addEventListener('click', () => swipers[active].slideNext());

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (tab.dataset.gallery === active) return;
            active = tab.dataset.gallery;

            tabs.forEach((t) => {
                const isActive = t === tab;
                t.classList.toggle('is-active', isActive);
                t.setAttribute('aria-selected', isActive);
            });

            panels.forEach((panel) => {
                panel.hidden = panel.dataset.galleryPanel !== active;
            });

            swipers[active].update();
            swipers[active].slideToLoop(0, 0);
        });
    });
});
// cases
initLoopSlider('.project_get__swiper', 5, {
    slidesPerView: 'auto',
    spaceBetween: 16,
    breakpoints: {
        0: { spaceBetween: 12 },
        769: { spaceBetween: 16 },
    },
});
initMobileSwiper('.project_get__swiper', {
    slidesPerView: 1.15,
    spaceBetween: 12,
    grabCursor: true,
});
// etages
document.querySelectorAll('.project_plan, .work_plan').forEach((section) => {
    const tabs = section.querySelectorAll('.tabs_etages__btn');
    const panels = section.querySelectorAll('[data-floor-panel]');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const floor = tab.dataset.floor;

            tabs.forEach((t) => {
                const isActive = t === tab;
                t.classList.toggle('is-active', isActive);
                t.setAttribute('aria-selected', isActive);
            });

            panels.forEach((panel) => {
                panel.hidden = panel.dataset.floorPanel !== floor;
            });
        });
    });
});

// reviews
initLoopSlider('.reviews_swiper', 3, {
    slidesPerView: 1,
    centeredSlides: true,
    slideToClickedSlide: true,
    spaceBetween: 16,
    navigation: {
        prevEl: '.reviews_arrow__prev',
        nextEl: '.reviews_arrow__next',
    },
    breakpoints: {
        768: { slidesPerView: 2 },
        1101: { slidesPerView: 3 },
    },
});
// history
const historyList = document.querySelector('.history_dates');

if (historyList) {
    const historyImgs = document.querySelectorAll('.history_img');
    const HISTORY_ACTIVE_INDEX = 2;
    let historyBusy = false;

    historyList.addEventListener('click', (e) => {
        const btn = e.target.closest('.history_date');
        if (!btn || historyBusy) return;

        const item = btn.closest('.history_item');
        if (item.classList.contains('is-active')) return;

        historyBusy = true;
        const items = [...historyList.children];
        const shift = HISTORY_ACTIVE_INDEX - items.indexOf(item);

        const first = new Map(items.map(el => [el, {
            top: el.getBoundingClientRect().top,
            h: el.querySelector('.history_date').getBoundingClientRect().height,
        }]));

        historyList.classList.add('no-anim');

        const wrapped = new Set();
        for (let i = 0; i < Math.abs(shift); i++) {
            if (shift > 0) {
                const last = historyList.lastElementChild;
                historyList.prepend(last);
                wrapped.add(last);
            } else {
                const firstEl = historyList.firstElementChild;
                historyList.append(firstEl);
                wrapped.add(firstEl);
            }
        }

        items.forEach(el => {
            const isActive = el === item;
            el.classList.toggle('is-active', isActive);
            el.querySelector('.history_date').toggleAttribute('aria-current', isActive);
        });

        items.forEach(el => {
            const date = el.querySelector('.history_date');
            const f = first.get(el);
            const scale = f.h / date.getBoundingClientRect().height;
            date.style.transform = `scale(${scale})`;

            if (wrapped.has(el)) {
                el.style.transform = `translateY(${shift > 0 ? -40 : 40}px)`;
                el.style.opacity = '0';
            } else {
                el.style.transform = `translateY(${f.top - el.getBoundingClientRect().top}px)`;
            }
        });

        historyList.offsetHeight;
        historyList.classList.remove('no-anim');

        items.forEach(el => {
            el.style.transform = '';
            el.style.opacity = '';
            el.querySelector('.history_date').style.transform = '';
        });

        historyImgs.forEach(img => {
            img.classList.toggle('is-active', img.dataset.id === item.dataset.id);
        });

        setTimeout(() => { historyBusy = false; }, 600);
    });
}
// team
initLoopSlider('.team_swiper', 3, {
    slidesPerView: 1.15,
    spaceBetween: 12,
    watchSlidesProgress: true,
    loop: true,
    grabCursor: true,
    speed: 500,
    autoplay: {
        delay: 4000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
    },
    navigation: {
        prevEl: '.team_arrow__prev',
        nextEl: '.team_arrow__next',
    },
    breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 18 },
        1101: { slidesPerView: 3, spaceBetween: 18 },
    },
});

// team mobile
const teamMobileEl = document.querySelector('.team_mobile_swiper');

if (teamMobileEl) {
    const mq = window.matchMedia('(max-width: 767px)');
    let teamSwiper = null;

    const toggleTeamSwiper = () => {
        if (mq.matches && !teamSwiper) {
            teamSwiper = new Swiper(teamMobileEl, {
                slidesPerView: 1.19,
                spaceBetween: 12,
                loop: true,
                grabCursor: true,
                speed: 500,
                autoplay: {
                    delay: 4000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                },
            });
        } else if (!mq.matches && teamSwiper) {
            teamSwiper.destroy(true, true);
            teamSwiper = null;
        }
    };

    toggleTeamSwiper();
    mq.addEventListener('change', toggleTeamSwiper);
}

function initMobileSwiper(selector, options) {
    const mq = window.matchMedia('(max-width: 767px)');

    document.querySelectorAll(selector).forEach((el) => {
        let swiper = null;

        const toggle = () => {
            if (mq.matches && !swiper) {
                swiper = new Swiper(el, options);
            } else if (!mq.matches && swiper) {
                swiper.destroy(true, true);
                swiper = null;
            }
        };

        toggle();
        mq.addEventListener('change', toggle);
    });
}

initMobileSwiper('.requirements_swiper', {
    slidesPerView: 1.15,
    spaceBetween: 12,
    grabCursor: true,
});
initMobileSwiper('.what_is_swiper', {
    slidesPerView: 1.25,
    spaceBetween: 12,
    grabCursor: true,
});
initMobileSwiper('.tasks_swiper', {
    slidesPerView: 1.25,
    spaceBetween: 12,
    grabCursor: true,
});
