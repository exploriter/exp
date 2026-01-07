import tippy, {roundArrow} from 'tippy.js';

tippy('[data-tooltip]', {
    content(reference) {
        return reference.getAttribute('data-tooltip');
    },
    arrow: roundArrow,
    animation: 'scale-subtle',
    inertia: true,
    allowHTML: true,
});