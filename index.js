import { getContext } from "../../../extensions.js";
import { syncSwipeToMes } from '../../../../script.js';


let dlg;
let $wrapper = $(document.createElement('div'));
let $dom = $(document.createElement('div'));
let swipes = [];
let cols = 0;
let swipesSoFar = 0;
let preExistingSwipesAlreadyAdded = false;

function cancelGen() {
    $('#send_form .mes_stop').trigger('click');
}

function closePopup() {
    cancelGen();
    if (dlg) {
        dlg.complete(true);
    }
    swipesSoFar = 0;
    $('.msw_wrapper').empty(); // clear old swipe elements
    dlg = null;
    swipes = [];
    cols = 0;
    $dom = $(document.createElement('div'));
    preExistingSwipesAlreadyAdded = false;
}


function handleStream(text) {

    const streamingProcessor = getContext().streamingProcessor;
    if (!streamingProcessor) {
        return;
    }
    if (streamingProcessor.swipes.length > 0) {

        if (!dlg) {
            console.warn("Creating popup for streaming swipes.");
            const Popup = getContext().Popup;

            $wrapper.addClass('msw_wrapper');
            $wrapper.text('Swipe Streamer');
            $wrapper.append($dom);
            const repeat = document.createElement('div')
            const stopGenButton = document.createElement('div');
            $(stopGenButton).addClass('msw_stopgen fa-solid fa-circle-stop');
            $(repeat).addClass('msw_repeat fa-solid fa-redo');
            $dom.append(repeat);
            $dom.append(stopGenButton);
            $(repeat).on('click', (e) => {
                cancelGen()
                const timesToClickRight = streamingProcessor.swipes.length + 1;
                for (let i = 0; i < timesToClickRight; i++) {
                    $(".last_mes .swipe_right").trigger('click');
                }
                console.warn("Repeat button clicked, triggering another swipe set.");
                e.stopPropagation();
            });
            $(stopGenButton).on('click', (e) => {
                cancelGen();
            });
            $dom.addClass('msw_popup');
            dlg = new Popup($wrapper, getContext().POPUP_TYPE.TEXT, null, {
                wide: true,
                wider: true,
                large: true,
                allowVerticalScrolling: true,
                okButton: "Close",
                onClose: closePopup
            });
            dlg.show();
            dlg.dlg.style.width = 'unset';
        }

        if (streamingProcessor.swipes.length > cols) {
            cols = streamingProcessor.swipes.length;
            $dom.css('grid-template-columns', `repeat(${streamingProcessor.swipes.length + 1}, 1fr)`);
        }

        if (!preExistingSwipesAlreadyAdded) {
            console.warn("We haven't added preexisting swipes yet. Checking if needed.");


            let chat = getContext().chat;
            let lastMesID = chat.length - 1;
            let lastMes = chat[lastMesID];
            let columnToFill = 1
            console.warn(lastMes.swipes);
            let preExistingSwipes = lastMes.swipes || [];

            if (preExistingSwipes.length > 1) {
                preExistingSwipes.forEach((swipe, idx) => {
                    const el = document.createElement('div');
                    const $el = $(el);
                    el.classList.add('mes');

                    el.style.gridColumnStart = (columnToFill).toString();

                    const inner = (document.createElement('div'));
                    console.warn(idx, swipe)
                    inner.textContent = swipe;
                    swipes[idx] = inner;
                    inner.classList.add('mes_text');

                    el.append(inner);
                    $dom.append(el);
                    $el.data('swipeidx', idx + 1);
                    $el.on('click', (e) => {
                        const swipeIdx = $el.data('swipeidx');
                        console.warn("Clicked swipe at index:", swipeIdx);
                        closePopup();
                        //syncSwipeToMes(null, swipeIdx);
                        e.stopPropagation();
                        console.warn("Syncing swipe to mes at index:", swipeIdx);
                    })
                    columnToFill++;
                    if (columnToFill > streamingProcessor.swipes.length + 1) {
                        columnToFill = 1
                    }

                });
                swipesSoFar = preExistingSwipes.length;

            } else {
                console.warn('saw no preexisting swipes, initializing empty swipes array.');
            }
            preExistingSwipesAlreadyAdded = true;
        }

        [text, ...streamingProcessor.swipes].forEach((swipe, idx) => {
            const swipeIdx = swipesSoFar + idx;
            //console.warn('Processing swipe at index:', idx, 'with swipeIdx:', swipeIdx);
            if (!swipes[swipeIdx]) {
                const el = document.createElement('div');
                const $el = $(el)
                el.classList.add('mes');
                el.style.gridColumnStart = (idx + 1).toString();

                const inner = document.createElement('div');
                swipes[swipeIdx] = inner;
                inner.classList.add('mes_text');

                el.append(inner);
                $dom.append(el);
                $el.data('swipeidx', swipeIdx + 1);
                $el.on('click', (e) => {
                    const swipeIdx = $el.data('swipeidx');
                    console.warn("Clicked swipe at index:", swipeIdx);
                    closePopup();
                    syncSwipeToMes(null, swipeIdx);
                    e.stopPropagation();
                    console.warn("Syncing swipe to mes at index:", swipeIdx);
                })
            }
            swipes[swipeIdx].innerHTML = getContext().messageFormatting(swipe, 'stream', false, false, -1);
        });
    }

}

jQuery(async () => {
    const eventSource = getContext().eventSource;
    const event_types = getContext().event_types;
    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, () => {
        let lastMesID = getContext().chat.length; //dont use -1 here because the new mes hasn't been added yet if we are making a new response
        let lastMes = getContext().chat[lastMesID];
        if (!lastMes) {
            lastMesID = getContext().chat.length - 1; // happens if adding more swipes to an existing mes
            lastMes = getContext().chat[lastMesID];
        }
        let currentSwipes = lastMes.swipes || 0;

        if (!dlg) {
            console.warn("incoming stream for mesID:", lastMesID, "but no popup, creating a new one. PreexistingSwipes:", currentSwipes);
            dlg = null;
            swipes = [];
            cols = 0;
            $('.msw_wrapper').empty(); // clear old swipe elements
        } else {
            console.warn("saw preexisting popup for stream on mesID:", lastMesID, "appending. PreexistingSwipes:", currentSwipes);
            swipesSoFar += swipes.length;
            $wrapper = $('.msw_wrapper')
            $wrapper.append($dom);
            $dom = $wrapper.find('.msw_popup').last();
        }

    });
    eventSource.on(event_types.STREAM_TOKEN_RECEIVED, handleStream);
    // eventSource.on(event_types.GENERATION_ENDED, closePopup);
});
