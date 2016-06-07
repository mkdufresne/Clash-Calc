part([
    'types',
    'dom',
    'localStorageSet'
], function(types, dom, localStorageSet) {

    'use strict';

    var all = ['barrack', 'level', 'quantity', 'total', 'subtract'];
    var views = {
        'light': {
            'quantity': ['level', 'quantity', 'total'],
            'subtract': ['quantity', 'subtract'],
            'barrack': ['barrack']
        },
        'dark': {
            'quantity': ['level', 'quantity', 'total'],
            'subtract': ['quantity', 'subtract'],
            'barrack': ['quantity', 'barrack']
        }
    };

    var switchView = function(type, view) {
        localStorageSet(type + '-view', view);

        all.forEach(function(col) {
            var colElements = dom.findCache('.js-col-' + type + '-' + col);
            var isHide = (views[type][view].indexOf(col) === -1);
            colElements.iterate(function(colEl) {
                colEl.style.display = (isHide ? 'none' : '');
                dom.toggleClass(colEl, 'active', !isHide);
                colEl.classList.remove('data__last');
            });
        });

        dom.find('.data tr').iterate(function(row) {
            var cells = row.querySelectorAll('.active');
            if (cells.length) {
                cells[cells.length - 1].classList.add('data__last');
            }
        });

        Object.keys(views[type]).forEach(function(viewItem) {
            var viewItemEl = document.querySelector(
                '.js-cols-switcher[data-type="' + type + '"][data-view="' + viewItem + '"]'
            );
            dom.toggleClass(viewItemEl, 'button_selected', (view === viewItem));
        });
    };

    var colSwitchers = dom.find('.js-cols-switcher');
    colSwitchers.listen('universalClick', function(e) {
        switchView(e.currentTarget.getAttribute('data-type'), e.currentTarget.getAttribute('data-view'));
    });


    var init = function() {
        ['light', 'dark'].forEach(function(type) {
            switchView(type, (localStorage.getItem(type + '-view') || 'quantity'));
        });
    };

    var mobileMatch = window.matchMedia('(max-width: 640px)');
    if (mobileMatch.matches) {
        init();
    }

    mobileMatch.addListener(function(currentMatch) {
        if (currentMatch.matches) {
            init();
        } else {
            ['light', 'dark'].forEach(function(type) {
                all.forEach(function(col) {
                    var colElements = dom.findCache('.js-col-' + type + '-' + col);
                    colElements.iterate(function(colEl) {
                        colEl.style.display = '';
                        colEl.classList.remove('data__last');
                        colEl.classList.remove('active');
                    });
                });
            });

            colSwitchers.iterate(function(colSwitcher) {
                colSwitcher.classList.remove('button_selected');
            });
        }
    });

});