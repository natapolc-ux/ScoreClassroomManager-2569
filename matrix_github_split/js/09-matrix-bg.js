function initMatrix(){

  columns =
    Math.floor(canvas.width / fontSize);

  drops = [];

  for(let i = 0; i < columns; i++){
    drops[i] = 1;
  }
}

initMatrix();

function draw(){

  ctx.fillStyle =
    "rgba(0,0,0,0.05)";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle =
    "#00ff41";

  ctx.font =
    fontSize + "px monospace";

  for(let i = 0; i < drops.length; i++){

    const text =
      letters[
        Math.floor(
          Math.random() * letters.length
        )
      ];

    ctx.fillText(
      text,
      i * fontSize,
      drops[i] * fontSize
    );

    if(
      drops[i] * fontSize > canvas.height &&
      Math.random() > 0.975
    ){
      drops[i] = 0;
    }

    drops[i]++;
  }
}

setInterval(draw, 33);

window.addEventListener("resize", () => {

  canvas.width =
    window.innerWidth;

  canvas.height =
    window.innerHeight;

  initMatrix();
});
