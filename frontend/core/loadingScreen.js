// core/loadingScreen.js
export class CustomLoadingScreen {
    constructor() {
        this.loadingUIText = "Loading AU Campus...";
        this.loadingUIBackgroundColor = "#111111";
    }
    displayLoadingUI() {
        // 1. Create the dark background overlay
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.id = "customLoadingScreen";
        this.loadingDiv.style.position = "absolute";
        this.loadingDiv.style.top = "0";
        this.loadingDiv.style.left = "0";
        this.loadingDiv.style.width = "100%";
        this.loadingDiv.style.height = "100%";
        this.loadingDiv.style.backgroundColor = this.loadingUIBackgroundColor;
        this.loadingDiv.style.display = "flex";
        this.loadingDiv.style.flexDirection = "column";
        this.loadingDiv.style.alignItems = "center";
        this.loadingDiv.style.justifyContent = "center";
        this.loadingDiv.style.zIndex = "9999";
        this.loadingDiv.style.fontFamily = "sans-serif";
        this.loadingDiv.style.transition = "opacity 0.5s ease"; // Smooth fade out

        // 2. Create the loading text
        const text = document.createElement("div");
        text.innerHTML = this.loadingUIText;
        text.style.color = "white";
        text.style.fontSize = "24px";
        text.style.fontWeight = "bold";
        text.style.marginBottom = "20px";
        this.loadingDiv.appendChild(text);

        // 3. Create the empty progress bar container
        const barContainer = document.createElement("div");
        barContainer.style.width = "300px";
        barContainer.style.height = "12px";
        barContainer.style.backgroundColor = "#333";
        barContainer.style.borderRadius = "6px";
        barContainer.style.overflow = "hidden";

        // 4. Create the colored animated fill
        this.progressBar = document.createElement("div");
        this.progressBar.style.width = "0%";
        this.progressBar.style.height = "100%";
        this.progressBar.style.backgroundColor = "#E53935"; // A nice red color
        this.progressBar.style.transition = "width 0.2s ease-out";
        barContainer.appendChild(this.progressBar);

        // Attach everything to the screen
        this.loadingDiv.appendChild(barContainer);
        document.body.appendChild(this.loadingDiv);

        // 5. Simulate a smooth loading animation up to 90%
        this.progress = 0;
        this.loadingInterval = setInterval(() => {
            this.progress += (90 - this.progress) * 0.1; // Slows down as it approaches 90
            if (this.progressBar) {
                this.progressBar.style.width = this.progress + "%";
            }
        }, 100);
    }
    hideLoadingUI() {
        if (this.loadingDiv) {
            // Stop the simulation and snap the bar to 100%
            clearInterval(this.loadingInterval);
            this.progressBar.style.width = "100%";

            // Wait a fraction of a second so the user sees it hit 100%, then fade out
            setTimeout(() => {
                this.loadingDiv.style.opacity = "0";
                setTimeout(() => {
                    this.loadingDiv.remove();
                }, 500); // Matches the CSS transition time
            }, 300);
        }
    }
}