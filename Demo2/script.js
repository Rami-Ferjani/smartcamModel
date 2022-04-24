$(document).ready(function () {
  init()
})

async function init() {
  //await faceapi.nets.ssdMobilenetv1.load('/')

  await faceapi.nets.tinyFaceDetector.load('/')
  await faceapi.loadFaceLandmarkModel('/')
  await faceapi.loadFaceExpressionModel('/')

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  const videoElement = $('#inputVideo').get(10)
  videoElement.srcObject = stream
}

function resizeCanvasAndResults(dimensions, canvas, results) {
  const { width, height } = faceapi.getMediaDimensions(dimensions)

  canvas.width = width
  canvas.height = height

  // resize detections (and landmarks) in case displayed image is smaller than
  // original size
  return faceapi.resizeResults(results, { width, height })
}

async function computeFaces() {

  const sourceVideo = $('#inputVideo').get(0)
  const canvas = $('#overlay').get(0)

  const timeLabel = $('#timeLabel').get(0)
  const fpsLabel = $('#fpsLabel').get(0)

  let inputSize = 224
  let scoreThreshold = 0.5
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })//

 //  let minConfidence = 0.5
 //  const options = new faceapi.SsdMobilenetv1Options({ minConfidence })

  while (true) {
    const startTime = new Date()

    let results = await faceapi
      .detectAllFaces(sourceVideo, options)
      .withFaceExpressions()
      .withFaceLandmarks()

      // console.log(results) to show results 
      //Can be used in other real time application
      // like drawing graphes  

    results = resizeCanvasAndResults(sourceVideo, canvas, results)

    const faceBoxes = results.map(det => det.detection)
    const drawFaceBoxesOptions = { withScore: false }

    faceapi.drawDetection(canvas, faceBoxes, drawFaceBoxesOptions)

    const faceLandmarks = results.map(det => det.landmarks)
    const drawLandmarksOptions = {
      lineWidth: 3,
      drawLines: true,
      color: 'green'
    }
  
    faceapi.drawLandmarks(canvas, faceLandmarks, drawLandmarksOptions)

    const faceExpressions = results.map(({ detection, expressions }) => ({ position: detection.box, expressions }))

    faceapi.drawFaceExpressions(canvas, faceExpressions)

    const processTime = new Date() - startTime
    timeLabel.innerHTML = "Time to process : " + processTime + " ms"
    fpsLabel.innerHTML = "Estimated frames per second : " + (1000 / processTime).toFixed(2)
    // tofixed(x) return x num after "," .
  }

}