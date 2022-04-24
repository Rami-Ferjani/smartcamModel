let faceMatcher = null

$(document).ready(function () {
  init()
})

async function init() {
  $('#authorizedAlert').hide()
  $('#unauthorizedAlert').hide()

  await faceapi.nets.tinyFaceDetector.load('/')

  await faceapi.nets.ssdMobilenetv1.load('/')
  await faceapi.loadFaceLandmarkModel('/')
  await faceapi.loadFaceRecognitionModel('/')

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  const videoEl = $('#inputVideo').get(0)
  videoEl.srcObject = stream
}

function resizeCanvasAndResults(dimensions, canvas, results) {
  const { width, height } = dimensions instanceof HTMLVideoElement
    ? faceapi.getMediaDimensions(dimensions)
    : dimensions
  canvas.width = width
  canvas.height = height

  // resize detections (and landmarks) in case displayed image is smaller than
  // original size
  return faceapi.resizeResults(results, { width, height })
}

async function selectSourceImage() {
  const imgFile = $('#sourceImageInput').get(0).files[0]
  const img = await faceapi.bufferToImage(imgFile)
  $('#sourceImage').get(0).src = img.src

  await computeFacesOnImage()
  computeFacesOnVideo()
}

async function computeFacesOnImage() {
  const imgEl = $('#sourceImage').get(0)
  const canvas = $('#sourceImageOverlay').get(0)

  let minConfidence = 0.5
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence })

  const fullFaceDescriptions = await faceapi
    .detectAllFaces(imgEl, options)
    .withFaceLandmarks()
    .withFaceDescriptors()


  // create FaceMatcher with automatically assigned labels
  // from the detection results for the reference image
  faceMatcher = new faceapi.FaceMatcher(fullFaceDescriptions,0.7)

  // resize detection and landmarks in case displayed image is smaller than
  // original size
  resizedResults = resizeCanvasAndResults(imgEl, canvas, fullFaceDescriptions)

  // draw boxes with the corresponding label as text
  const labels = faceMatcher.labeledDescriptors
    .map(ld => ld.label)

  const boxesWithText = resizedResults
    .map(res => res.detection.box)
    .map((box, i) => new faceapi.BoxWithText(box, labels[i]))

  faceapi.drawDetection(canvas, boxesWithText)
}

async function computeFacesOnVideo() {
  const videoEl = $('#inputVideo').get(0)
  const canvas = $('#videoOverlay').get(0)

  const authorizedAlert = $('#authorizedAlert')
  const unauthorizedAlert = $('#unauthorizedAlert')

  let minConfidence = 0.5
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence })

  // let inputSize = 224
  // let scoreThreshold = 0.5
  // const options = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })

  while (true) {

    const results = await faceapi
      .detectAllFaces(videoEl, options)
      .withFaceLandmarks()
      .withFaceDescriptors()

    // resize detection and landmarks in case displayed image is smaller than
    // original size
    resizedResults = resizeCanvasAndResults(videoEl, canvas, results)

    let personsList = []

    // draw boxes with the corresponding label as text
    const boxesWithText = resizedResults.map(({ detection, descriptor }) => {

      // match each face descriptor to the reference descriptor
      // with lowest euclidean distance and display the result as text
      const personName = faceMatcher.findBestMatch(descriptor).toString()
      // toString() give the name of the person 
      personsList.push(personName)

      return new faceapi.BoxWithText(detection.box, personName)
    })

    faceapi.drawDetection(canvas, boxesWithText)

    let getAccess = true

    for (person of personsList)
      if (person.indexOf('unknown')) {
        getAccess = false
        break
      }

    if (!getAccess) {
      authorizedAlert.show()
      unauthorizedAlert.hide()
    }  else {
      authorizedAlert.hide()
      unauthorizedAlert.show()
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}