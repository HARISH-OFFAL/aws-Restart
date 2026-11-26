/* ================= LOADER FIX ================= */

window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    loader.style.opacity = "0";

    loader.style.visibility = "hidden";

});

/* ================= TYPING EFFECT ================= */

var typed = new Typed(".typing", {

    strings: [

        "Data Science Enthusiast",
        "AI Developer",
        "Frontend Developer",
        "Machine Learning Learner"

    ],

    typeSpeed: 70,
    backSpeed: 50,
    loop: true

});

/* ================= PARTICLES ================= */

particlesJS("particles-js", {

    particles: {

        number: {

            value: 80

        },

        size: {

            value: 3

        },

        color: {

            value: "#38bdf8"

        },

        line_linked: {

            enable: true,
            color: "#38bdf8"

        },

        move: {

            speed: 2

        }

    }

});

/* ================= VANILLA TILT ================= */

VanillaTilt.init(document.querySelectorAll(".project-card"), {

    max: 15,
    speed: 400,
    glare: true,
    "max-glare": 0.3

});

VanillaTilt.init(document.querySelectorAll(".skill-card"), {

    max: 15,
    speed: 400,
    glare: true,
    "max-glare": 0.3

});

/* ================= AOS ================= */

AOS.init({

    duration: 1000,
    once: true

});