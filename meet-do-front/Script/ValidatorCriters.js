let group_form = document.querySelector(".groupForm");
let input = group_form.password;
let digit = document.querySelector(".digit");
let uppercase = document.querySelector(".uppercase");
let lowercase = document.querySelector(".lowercase");
let length = document.querySelector(".length");


let validator = document.querySelector(".validatorCriters");

input.addEventListener("input", function(){
    if (this.value && validator.style.display !== "block") {
        validator.style.display = "block";
    }

    validation(this);

    if(!this.value){
        remove();
        validator.style.display = "none";
    }
});


input.addEventListener("input", function(){
    validation(this);

    if(!this.value){
        remove();
    }
})

function validation(password){
    
    if(/[0-9]{1}/.test(password.value)){
        input.classList.remove("invalide");
        digit.classList.remove("error");

        input.classList.add("succes");
        digit.classList.add("succes");
    }
    else{
        input.classList.remove("succes");
        digit.classList.remove("succes");

        input.classList.add("invalide");
        digit.classList.add("error");
    }

    if(/[A-Z]{1}/.test(password.value)){
        input.classList.remove("invalide");
        uppercase.classList.remove("error");

        input.classList.add("succes");
        uppercase.classList.add("succes")
    }
    else{
        input.classList.remove("succes");
        uppercase.classList.remove("succes");

        input.classList.add("invalide");
        uppercase.classList.add("error");
    }

    if(/[a-z]{1}/.test(password.value)){
        input.classList.remove("invalide");
        lowercase.classList.remove("error");

        input.classList.add("succes");
        lowercase.classList.add("succes")
    }
    else{
        input.classList.remove("succes");
        lowercase.classList.remove("succes");

        input.classList.add("invalide");
        lowercase.classList.add("error");
    }
    
    if(password.value.length >= 8){
        length.classList.remove("error");
        length.classList.add("succes");
    }
    else{
        length.classList.add("error");
        length.classList.remove("succes");
    }
}
function remove(){

    input.classList.remove("invalide");
    input.classList.remove("succes");

    digit.classList.remove("error");
    digit.classList.remove("succes");

    uppercase.classList.remove("succes");
    uppercase.classList.remove("error");

    lowercase.classList.remove("succes");
    lowercase.classList.remove("error")

    length.classList.remove("succes")
    length.classList.remove("error");
}