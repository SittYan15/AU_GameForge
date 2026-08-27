// core/loadingScreen.js
export class CustomLoadingScreen {
    constructor() {
        this.loadingUIText = "Loading AU Campus...";
        this.loadingUIBackgroundColor = "#101114";

        this.loadingDiv = null;
        this.progressBar = null;
        this.progressText = null;
        this.sizeText = null;
        this.remainingText = null;
        this.stageText = null;
        this.statusText = null;
        this.spinnerStyle = null;

        this.currentAsset = "";
        this.currentLoaded = 0;
        this.currentTotal = 0;

        this.rateLastLoaded = 0;
        this.rateLastTime =
            performance.now();
        this.smoothedBytesPerSecond = 0;
        this.currentStage = 0;
        this.totalStages = 0;
        this.hideTimer = null;

        this.rateLastLoaded = 0;
        this.rateLastTime = 0;
        this.smoothedBytesPerSecond = 0;
    }

    formatMB(bytes) {
        const value = Number(bytes) || 0;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDownloadRate(bytesPerSecond) {
        const value =
            Math.max(
                0,
                Number(bytesPerSecond) || 0
            );

        const oneMB =
            1024 * 1024;

        if (value >= oneMB) {
            return (
                (value / oneMB).toFixed(1) +
                " MB/s"
            );
        }

        return (
            (value / 1024).toFixed(0) +
            " KB/s"
        );
    }

    ensureSpinnerStyle() {
        if (document.getElementById("auLoadingSpinnerStyle")) {
            return;
        }

        this.spinnerStyle = document.createElement("style");
        this.spinnerStyle.id = "auLoadingSpinnerStyle";
        this.spinnerStyle.textContent = `
            @keyframes au-loading-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes au-loading-pulse {
                0%, 100% { opacity: .55; }
                50% { opacity: 1; }
            }
        `;

        document.head.appendChild(this.spinnerStyle);
    }

    displayLoadingUI() {
        if (this.hideTimer) {
            window.clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }

        const old = document.getElementById("customLoadingScreen");
        if (old) {
            old.remove();
        }

        this.ensureSpinnerStyle();

        this.loadingDiv = document.createElement("div");
        this.loadingDiv.id = "customLoadingScreen";

        Object.assign(this.loadingDiv.style, {
            position: "fixed",
            inset: "0",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "24px",
            background:
                "radial-gradient(circle at 50% 18%, #242832 0%, #15171c 35%, #0b0c0f 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "99999",
            color: "#ffffff",
            fontFamily:
                'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            transition: "opacity .35s ease"
        });

        const card = document.createElement("div");

        Object.assign(card.style, {
            width: "min(560px, 100%)",
            boxSizing: "border-box",
            padding: "30px 28px 26px",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: "22px",
            background: "rgba(12,14,18,.88)",
            boxShadow: "0 24px 70px rgba(0,0,0,.48)",
            backdropFilter: "blur(14px)",
            textAlign: "center"
        });

        const logoWrap = document.createElement("div");

        Object.assign(logoWrap.style, {
            position: "relative",
            width: "86px",
            height: "86px",
            margin: "0 auto 18px"
        });

        const spinner = document.createElement("div");

        Object.assign(spinner.style, {
            position: "absolute",
            inset: "0",
            borderRadius: "50%",
            border: "6px solid rgba(255,255,255,.12)",
            borderTopColor: "#ef4444",
            borderRightColor: "#ff8a65",
            boxSizing: "border-box",
            animation: "au-loading-spin 1s linear infinite"
        });

        const logoText = document.createElement("div");
        logoText.textContent = "AU";

        Object.assign(logoText.style, {
            position: "absolute",
            inset: "0",
            display: "grid",
            placeItems: "center",
            fontWeight: "900",
            fontSize: "24px",
            letterSpacing: "-1px",
            color: "#ffffff"
        });

        logoWrap.append(spinner, logoText);

        const title = document.createElement("div");
        title.textContent = "Loading AU Campus";

        Object.assign(title.style, {
            fontSize: "clamp(24px, 4vw, 34px)",
            fontWeight: "900",
            letterSpacing: "-0.03em",
            marginBottom: "7px"
        });

        this.statusText = document.createElement("div");
        this.statusText.textContent = "Preparing game content...";

        Object.assign(this.statusText.style, {
            minHeight: "22px",
            color: "#c9ced8",
            fontSize: "14px",
            lineHeight: "1.45",
            marginBottom: "20px"
        });

        const infoRow = document.createElement("div");

        Object.assign(infoRow.style, {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "9px",
            fontSize: "12px",
            fontWeight: "800"
        });

        this.stageText = document.createElement("span");
        this.stageText.textContent = "Preparing...";

        Object.assign(this.stageText.style, {
            color: "#aeb5c0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left"
        });

        this.progressText = document.createElement("span");
        this.progressText.textContent = "0%";

        Object.assign(this.progressText.style, {
            color: "#ffffff",
            fontVariantNumeric: "tabular-nums"
        });

        infoRow.append(
            this.stageText,
            this.progressText
        );

        const barOuter = document.createElement("div");

        Object.assign(barOuter.style, {
            position: "relative",
            width: "100%",
            height: "14px",
            overflow: "hidden",
            borderRadius: "999px",
            background: "#2b2f38",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)"
        });

        this.progressBar = document.createElement("div");

        Object.assign(this.progressBar.style, {
            width: "0%",
            height: "100%",
            borderRadius: "inherit",
            background:
                "linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #fb7185 100%)",
            boxShadow: "0 0 18px rgba(239,68,68,.42)",
            transition: "width .12s linear"
        });

        barOuter.appendChild(this.progressBar);

        const downloadRow = document.createElement("div");

        Object.assign(downloadRow.style, {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "12px",
            textAlign: "left"
        });

        const makeMetric = (caption) => {
            const box = document.createElement("div");

            Object.assign(box.style, {
                padding: "11px 12px",
                borderRadius: "12px",
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.07)"
            });

            const small = document.createElement("div");
            small.textContent = caption;

            Object.assign(small.style, {
                marginBottom: "3px",
                color: "#8f98a7",
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: ".08em",
                textTransform: "uppercase"
            });

            const value = document.createElement("div");

            Object.assign(value.style, {
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "800",
                fontVariantNumeric: "tabular-nums"
            });

            box.append(small, value);

            return {
                box,
                value
            };
        };

        const downloaded = makeMetric("Downloaded");
        const remaining = makeMetric("Download rate");

        this.sizeText = downloaded.value;
        this.remainingText = remaining.value;

        this.sizeText.textContent = "0.0 MB";
        this.remainingText.textContent = "0 KB/s";

        downloadRow.append(
            downloaded.box,
            remaining.box
        );

        const hint = document.createElement("div");
        hint.textContent =
            "Please keep this page open while the campus content is loading.";

        Object.assign(hint.style, {
            marginTop: "16px",
            color: "#707887",
            fontSize: "11px",
            lineHeight: "1.4"
        });

        card.append(
            logoWrap,
            title,
            this.statusText,
            infoRow,
            barOuter,
            downloadRow,
            hint
        );

        this.loadingDiv.appendChild(card);
        document.body.appendChild(this.loadingDiv);

        this.resetProgress();
    }

    resetProgress() {
        this.currentLoaded = 0;
        this.currentTotal = 0;

        if (this.progressBar) {
            this.progressBar.style.width = "0%";
        }

        if (this.progressText) {
            this.progressText.textContent = "0%";
        }

        if (this.sizeText) {
            this.sizeText.textContent = "0.0 MB";
        }

        if (this.remainingText) {
            this.remainingText.textContent = "0 KB/s";
        }
    }

    beginAsset(
        label,
        stageIndex = 0,
        totalStages = 0
    ) {
        this.currentAsset = label || "Game content";
        this.currentStage = Number(stageIndex) || 0;
        this.totalStages = Number(totalStages) || 0;

        this.resetProgress();

        if (this.stageText) {
            const stage =
                this.currentStage > 0 &&
                this.totalStages > 0
                    ? `Stage ${this.currentStage}/${this.totalStages} • `
                    : "";

            this.stageText.textContent =
                `${stage}${this.currentAsset}`;
        }

        if (this.statusText) {
            this.statusText.textContent =
                `Downloading ${this.currentAsset}...`;
        }
    }

    updateAssetProgress(
        event,
        label = this.currentAsset
    ) {
        if (!event) {
            return;
        }

        const loaded =
            Number(event.loaded) || 0;

        const total =
            Number(event.total) || 0;

        this.currentLoaded = loaded;

        if (total > 0) {
            this.currentTotal = total;
        }

        const rateNow =
            performance.now();

        const rateElapsedMs =
            rateNow -
            this.rateLastTime;

        if (
            rateElapsedMs >= 200 &&
            loaded >=
                this.rateLastLoaded
        ) {
            const rawBytesPerSecond =
                (
                    loaded -
                    this.rateLastLoaded
                ) /
                (
                    rateElapsedMs /
                    1000
                );

            this.smoothedBytesPerSecond =
                this.smoothedBytesPerSecond >
                    0
                    ? (
                        this.smoothedBytesPerSecond *
                            0.72 +
                        rawBytesPerSecond *
                            0.28
                    )
                    : rawBytesPerSecond;

            this.rateLastLoaded =
                loaded;

            this.rateLastTime =
                rateNow;
        }

        if (
            label &&
            label !== this.currentAsset
        ) {
            this.currentAsset = label;
        }

        const knownTotal =
            this.currentTotal > 0;

        const percent =
            knownTotal
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            this.currentLoaded /
                            this.currentTotal
                        ) * 100
                    )
                )
                : 0;

        if (this.progressBar) {
            this.progressBar.style.width =
                knownTotal
                    ? `${percent.toFixed(2)}%`
                    : "18%";

            this.progressBar.style.animation =
                knownTotal
                    ? "none"
                    : "au-loading-pulse .8s ease-in-out infinite";
        }

        if (this.progressText) {
            this.progressText.textContent =
                knownTotal
                    ? `${Math.floor(percent)}%`
                    : "...";
        }

        if (this.sizeText) {
            this.sizeText.textContent =
                knownTotal
                    ? `${this.formatMB(this.currentLoaded)} / ${this.formatMB(this.currentTotal)}`
                    : this.formatMB(this.currentLoaded);
        }

        if (this.remainingText) {
            this.remainingText.textContent =
                this.formatDownloadRate(
                    this.smoothedBytesPerSecond
                );
        }
    }

    completeAsset(
        label = this.currentAsset
    ) {
        if (this.progressBar) {
            this.progressBar.style.animation = "none";
            this.progressBar.style.width = "100%";
        }

        if (this.progressText) {
            this.progressText.textContent = "100%";
        }

        if (
            this.currentTotal > 0
        ) {
            this.currentLoaded =
                this.currentTotal;

            if (this.sizeText) {
                this.sizeText.textContent =
                    `${this.formatMB(this.currentTotal)} / ${this.formatMB(this.currentTotal)}`;
            }
        }

        if (this.remainingText) {
            this.remainingText.textContent =
                "0 KB/s";
        }

        if (this.statusText) {
            this.statusText.textContent =
                `${label || "Content"} loaded.`;
        }
    }

    setStatus(
        text,
        detail = ""
    ) {
        if (this.statusText) {
            this.statusText.textContent =
                detail
                    ? `${text} • ${detail}`
                    : text;
        }
    }

    hideLoadingUI() {
        if (!this.loadingDiv) {
            return;
        }

        if (this.progressBar) {
            this.progressBar.style.animation = "none";
            this.progressBar.style.width = "100%";
        }

        if (this.progressText) {
            this.progressText.textContent = "100%";
        }

        if (this.remainingText) {
            this.remainingText.textContent = "0.0 MB";
        }

        this.setStatus(
            "Campus ready",
            "Entering the world..."
        );

        const loadingDiv =
            this.loadingDiv;

        this.hideTimer =
            window.setTimeout(
                () => {
                    loadingDiv.style.opacity =
                        "0";

                    window.setTimeout(
                        () => {
                            loadingDiv.remove();

                            if (
                                this.loadingDiv ===
                                loadingDiv
                            ) {
                                this.loadingDiv = null;
                            }
                        },
                        350
                    );
                },
                250
            );
    }
}
