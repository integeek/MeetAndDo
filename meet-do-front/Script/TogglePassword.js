document.querySelectorAll(".togglePassword").forEach((toggle) => {
    toggle.addEventListener("click", function() {
        let passwordField = this.previousElementSibling;
        if (passwordField.type === "password") {
            passwordField.type = "text";
            this.src = "../assets/img/icon-eye-closed.png"; 
        } else {
            passwordField.type = "password";
            this.src = "../assets/img/icon-eye-open.png"; 
        }
    });
});
