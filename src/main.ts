class Color {
    r: number;
    g: number;
    b: number;
    extraData:number;
    constructor(r: number, g: number, b: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.extraData = -1; 
    }

    getData():number{ return this.extraData; } 
    setData(n:number){ this.extraData = n; }
  
    distance(c: Color): number {
      let dr = this.r - c.r;
      let dg = this.g - c.g;
      let db = this.b - c.b;
      dr *= dr;
      dg *= dg;
      db *= db;
      return dr + dg + db;
    }

    static rand():number{
      return Math.random()*255;
    }

    static random():Color{
     return new Color(Color.rand(), Color.rand(), Color.rand()); 
    }

    add(c : Color):Color{
      this.g += c.g; 
      this.b += c.b; 
      this.r += c.r; 
      return this;
    }

    div(num:number):Color{
      this.g /= num; 
      this.b /= num; 
      this.r /= num;
      return this;
    }

    static compare(c1:Color, c2:Color){
      return c1.r == c2.r && c1.b == c2.b && c1.g == c2.g; 
    }

    static arrayEquals(c1:Color[], c2:Color[]):boolean{
      if (c1.length != c2.length) 
        return false; 
      for (let i = 0; i < c1.length; i++){
        if (!Color.compare(c1[i], c2[i])){
          return false; 
        }
      }
      return true; 
    }

    static copy(c:Color):Color{
      return new Color(c.r, c.g, c.b); 
    }

  }
  
  function getImageData(img: HTMLImageElement): ImageData {
    let tempCanvas = document.createElement("canvas");
    let tmpCxt = tempCanvas.getContext("2d");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tmpCxt?.drawImage(img, 0, 0);
    return tmpCxt!.getImageData(0, 0, img.width, img.height);
  }
  
  function printRGB(r: number, g: number, b: number): void {
    console.log("R: " + r + " G: " + g + " B: " + b);
  }

  function imageToColors(data:Uint8ClampedArray):Color[]{
    let pixels: Color[] = [];
    let i = 0; 
    for (; i <= data.length - 4; i += 4) {
      let red = data[i];
      let green = data[i + 1];
      let blue = data[i + 2];
      pixels.push(new Color(red, green, blue));
    }
    return pixels;
  }
  
  function processImageData(
    data: Uint8ClampedArray,
    colorMatch: ColorMatcher
  ): Color[] {
    let i = 0;
    let pixels: Color[] = [];
    for (; i <= data.length - 4; i += 4) {
      let red = data[i];
      let green = data[i + 1];
      let blue = data[i + 2];
      let _ = data[i + 3];
      pixels.push(
        colorMatch.getSuitableColor(BABEL_COLOR_MAP, new Color(red, green, blue))
      );
    }
    return pixels;
  }
  
  function unravelColors(colors: Color[]): Uint8ClampedArray {
    let data: number[] = [];
    let i = 0;
    for (; i < colors.length; i++) {
      data.push(colors[i].r);
      data.push(colors[i].g);
      data.push(colors[i].b);
      data.push(100); // default hsl
    }
    let uint8Arr = new Uint8ClampedArray(data.length);
    i = 0;
    for (; i < data.length; i++) uint8Arr[i] = data[i];
    return uint8Arr;
  }
  
  //Different approaches to approximate pixel color to pre-defined colors in color-map
  interface ColorMatcher {
    getSuitableColor(colorMap: Color[], c: Color): Color;
  }
  
  class DistanceMatch implements ColorMatcher {
    getSuitableColor(colorMap: Color[], c: Color): Color {
      let i = 0;
      let min = 0;
      let ind = 0;
      for (; i < colorMap.length; i++) {
        let d = colorMap[i].distance(c);
        if (i == 0) {
          min = d;
        } else {
          if (d < min) {
            ind = i;
            min = d;
          }
        }
      }
      return colorMap[ind];
    }
  }
  
  class NaiveColorMatcher implements ColorMatcher {
    getSuitableColor(colorMap: Color[], c: Color): Color {
      let r = c.r;
      let g = c.g;
      let b = c.b;
      let max = Math.max(r, g);
      max = Math.max(max, b);
      let lbl = "r";
      if (max == g) lbl = "g";
      if (max == b) lbl = "b";
  
      let i = 0;
      let min = 0;
      let ind = 0;
      for (; i < colorMap.length; i++) {
        let d = colorMap[i].r;
        if (lbl == "b") d = colorMap[i].b;
        if (lbl == "g") d = colorMap[i].g;
  
        d = max - d;
        d *= d;
  
        if (i == 0) {
          min = d;
        } else {
          if (d < min) {
            ind = i;
            min = d;
          }
        }
      }
      return colorMap[ind];
    }
  }

  class KMeansColor implements ColorMatcher{
    points:Color[]; 
    means:Color[];
    
    constructor(points:Color[], colorSize:number){
      this.points = points; 
      this.means = this.fit(colorSize); 
    }

    fit(colorSize:number):Color[]{
      let clusters:number[][] = [];
      let means:Color[] = [];
      for (let i = 0; i < colorSize; i++){
        means.push(Color.random());
        clusters.push([]);
      }
      let k = 0;
      while(k < 100){
        for (let i = 0; i < this.points.length; i++){
          let minD = this.points[i].distance(means[0]);
          let ind = 0;  
          for (let j = 1; j < means.length; j++){
            let d = this.points[i].distance(means[j]); 
            if (minD > d){
              minD = d; 
              ind = j; 
            }
          } 
          clusters[ind].push(i);      
        }
        let updatedMeans:Color[] = [];
        for (let i = 0; i < clusters.length; i++){
          let cluster = clusters[i]; 
          let c : Color = new Color(0,0,0); 
          for (let j = 0; j < cluster.length; j++){
            c.add(this.points[cluster[j]]); 
          }
          updatedMeans.push(c.div(cluster.length));
        }
        means = updatedMeans;
        k++;
      }
      return means;
    }

    getSuitableColor(colorMap: Color[], c: Color): Color {
      let minD = c.distance(this.means[0]);
      let ind = 0;  
      for (let j = 1; j < this.means.length; j++){
        let d = c.distance(this.means[j]); 
        if (minD > d){
          minD = d; 
          ind = j; 
        }
      } 
      let r = Color.copy(this.means[ind]);
      r.setData(ind); 
      return r;
    }

  }
  //end of approaches
  
  function mapToSymbol(symbols:string, c:Color):string{
    let d = c.getData(); 
    if (d < 0 || d > symbols.length) 
        return ""; 
    return symbols[d];
  }

  function imageToText(symbols:string, colorData:Color[]):string{
    let text:string = "";
    for (let i = 0; i < colorData.length; i++){
      text += mapToSymbol(symbols, colorData[i]);
    }
    return text; 
  }

  const BABEL_SYMBOLS = 'abcdefghijklmnopqrstuvwxyz. ,';
  const BABEL_COLOR_MAP: Color[] = [
    // contains colors for each letter in babel lib (MAX 29).
    new Color(0, 0, 0), //1
    new Color(255, 255, 255), //2
    new Color(224, 224, 224), //3
    new Color(128, 128, 128), //4
    new Color(64, 64, 64), //5
    new Color(255, 0, 0), //6
    new Color(255, 0, 0), //7
    new Color(255, 96, 208), //8
    new Color(160, 32, 255), //9
    new Color(160, 32, 255), //10
    new Color(80, 208, 255), //11
    new Color(0, 32, 255), //12
    new Color(96, 255, 128), //13
    new Color(0, 192, 0), //14
    new Color(255, 224, 32), //15
    new Color(255, 160, 16), //16
    new Color(160, 128, 96), //17
    new Color(255, 208, 160), //18
  ];
  const COLOR_SIZE = 5;
  
  const mainCanvas = <HTMLCanvasElement>document.getElementById("mainCanvas");
  const ctx = <CanvasRenderingContext2D>mainCanvas!.getContext("2d");
  const testImage = <HTMLImageElement>document.getElementById("testImage");
  
  mainCanvas.width = testImage.width;
  mainCanvas.height = testImage.height;

  let imgData = getImageData(testImage).data;
  let colorMatcherApproach: ColorMatcher = new KMeansColor(imageToColors(imgData), COLOR_SIZE);
  let colorData:Color[] = processImageData(imgData, colorMatcherApproach);
  
  console.log(imageToText(BABEL_SYMBOLS, colorData));

  //Visualization: 
  // let data: Uint8ClampedArray = unravelColors(
  //   colorData
  // );
  // let imageData = new ImageData(data, testImage.width, testImage.height);
  // console.log(imageData);
  // ctx.putImageData(imageData, 0, 0);


  