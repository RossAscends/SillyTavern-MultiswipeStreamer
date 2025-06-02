import { getContext } from "../../../extensions.js";


let dlg;
let dom;
let swipes = [];
let cols = 0;

function cancelGen() {	
	$('#send_form .mes_stop').click();
}

function closePopup() {
	if (dlg) {
		dlg.complete(true);
	}
}

function handleStream(text) {
  const streamingProcessor = getContext().streamingProcessor;
  if (!streamingProcessor) {
		return;
  }
	if (streamingProcessor.swipes.length > 0) {
		if (!dlg) {
			const Popup = getContext().Popup;
			dom = document.createElement('div');
			dom.classList.add('msw_popup');
			dlg = new Popup(dom, getContext().POPUP_TYPE.TEXT, null, {
				wide: true,
				wider: true,
				large: true,
				allowVerticalScrolling: true,
				okButton: "Stop",
				onClose: cancelGen
			});
			dlg.show();
			dlg.dlg.style.width = 'unset';
		}
		if (streamingProcessor.swipes.length > cols) {
			cols = streamingProcessor.swipes.length;
			dom.style.gridTemplateColumns = `repeat(${streamingProcessor.swipes.length + 1}, 1fr)`;
		}
		[text, ...streamingProcessor.swipes].forEach((swipe, idx)=>{
			if (!swipes[idx]) {
				const el = document.createElement('div');
				el.classList.add('mes');
				el.style.gridColumnStart = (idx + 1).toString();

				const inner = document.createElement('div');
				swipes[idx] = inner;
				inner.classList.add('mes_text');

				el.append(inner);
				dom.append(el);
			}
			swipes[idx].innerHTML = getContext().messageFormatting(swipe, 'stream', false, false, -1);
		});
	}
}

jQuery(async () => {
	const eventSource = getContext().eventSource;
	const event_types = getContext().event_types;
	eventSource.on(event_types.GENERATION_AFTER_COMMANDS, ()=>{
		dom = null;
		dlg = null;
		swipes = [];
		cols = 0;
	});
	eventSource.on(event_types.STREAM_TOKEN_RECEIVED, handleStream);
	// eventSource.on(event_types.GENERATION_ENDED, closePopup);
});
