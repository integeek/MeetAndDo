function Footer(url = "..") {
    const pagePath = `${url}/Page`;

    return `
        <div class="meetdo-footer-inner container-fluid">
            <ul class="footerLinks d-flex align-items-center justify-content-between w-100 mb-0">
                <li><a href="${pagePath}/Faq.html">FAQ</a></li>
                <li><a href="${pagePath}/Contact.html">Contact us</a></li>
                <li><a href="${pagePath}/MentionLegales">General terms of use</a></li>
                <li><a href="${pagePath}/CGU">Legal Notice</a></li>
            </ul>
        </div>
    `;
};
