# Makefile for visualization build
# Run from ./visualization directory

NODE := node
SCRIPTS_DIR := ../scripts

.PHONY: build serve clean clean-cache unfurl unfurl-fallback build-full

## build: Build visualization (index.html, data files, service worker)
build:
	@echo ""
	@echo "Building visualization..."
	@echo ""
	$(NODE) build-static.js

## serve: Start local development server
serve:
	@echo ""
	@echo "Starting local server at http://localhost:8090"
	@echo "Press Ctrl+C to stop"
	@echo ""
	npx serve -l 8090

## clean: Remove generated files
clean:
	rm -f data-*.json data.json index.html sw.js

## clean-cache: Remove malformed cache entries (Phase 2)
clean-cache:
	@echo ""
	@echo "Cleaning URL cache..."
	@echo ""
	$(NODE) $(SCRIPTS_DIR)/clean-url-cache.js

## unfurl: Unfurl short URLs with DoH proxy (Phase 3)
unfurl:
	@echo ""
	@echo "Unfurling URLs with DoH proxy..."
	@echo ""
	$(NODE) $(SCRIPTS_DIR)/unfurl-urls-doh.js

## unfurl-fallback: Unfurl failed URLs with browser automation (camoufox, playwright-stealth)
unfurl-fallback:
	@echo ""
	@echo "Unfurling failed URLs with browser automation fallback chain..."
	@echo "  Fallback order: curl-doh -> camoufox -> playwright-stealth"
	@echo ""
	python3 $(SCRIPTS_DIR)/unfurl-urls-fallback.py

## build-full: Full build with URL cache cleanup and unfurling
build-full: clean-cache unfurl build
	@echo ""
	@echo "Full build complete!"

## build-complete: Full build including browser-based unfurling for stubborn URLs
build-complete: clean-cache unfurl unfurl-fallback build
	@echo ""
	@echo "Complete build with all unfurling methods done!"
