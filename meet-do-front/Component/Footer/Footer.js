function Footer(url) {
        return `
        <div>
            <ul class="footerLinks">
                <li><a href="./Faq">FAQ</a></li>
                <li><a href="./Formulaire">Contact us</a></li>
                <li><a href="./MentionLegales">General terms of use</a></li>
                <li><a href="./CGU">CGU</a></li>
            </ul>
        </div>
        <div class="footerSocialContainer">
            <a href="https://www.linkedin.com/"><img src="${url}/Assets/img/icon-linkedin.png" alt="linkedin" class="footerSocial"></a>
            <a href="https://www.facebook.com/"><img src="${url}/Assets/img/icon-facebook.png" alt="facebook" class="footerSocial"></a>
            <a href="https://www.twitter.com/"><img src="${url}/Assets/img/icon-x.png" alt="twitter" class="footerSocial"></a>
            <a href="https://www.instagram.com/"><img src="${url}/Assets/img/icon-instagram.png" alt="instagram" class="footerSocial"></a>
        </div>
    `;
};