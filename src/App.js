import './App.css';
import React from 'react';
import { useSpeechSynthesis } from "react-speech-kit";
import axios from 'axios';

let wait = false;

const serverEndpoint = "http://127.0.0.1:8001";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.videoRef = React.createRef();
    this.photoRef = React.createRef()
  }

  state = {
    receiveCommand: true,
    recorder: null,
    photoScreen: false,
    image: "",
    caption: "",
    repeat: true
  }

  componentDidMount() {
    navigator.mediaDevices.getUserMedia({
      audio: true,
    })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        this.setState({ recorder: recorder })
        const ws = new WebSocket('ws://localhost:8000/ws')
        ws.onopen = () => {
          console.log("socket connected")
          recorder.addEventListener('dataavailable', ({ data }) => {
            // recorder.pause()
            let reader = new FileReader();
            reader.readAsDataURL(data);
            reader.onloadend = function () {
              let base64String = reader.result;
              let data = base64String.substring(base64String.indexOf(',') + 1)
              ws.send(data)
            }
          });
          recorder.start(1000)
        }
        ws.onmessage = (ev) => {
          const recv = JSON.parse(ev.data)

          if (wait) {
            // console.log("not yet handle", recv)
            return
          }

          console.log("checking action")
          // command to take picture "bắn"
          if (true) {
            wait = true
            this.setState({ photoScreen: true })
            this.takePicture()
            // this.setState({ photoScreen: false })
          }

          // command to repeat caption "A"
          if (false) {
            this.props.speak({ text: this.state.caption })
          }

          // command to download image and back to camera "phai"
          if (false) {
            wait = true
            this.downloadImage()
            this.props.speak({ text: "Image is downloaded successfully" })
            // wait 2 seconds until 
            setTimeout(() => {
              wait = false
            }, 1000)
          }

          // command to get back to camera sreen "trai"
          if (false) {
            this.setState({ photoScreen: false })
            this.props.speak({ text: "Taking picture" })
          }
        }
      });

    navigator.mediaDevices
      .getUserMedia({
        video: true
      })
      .then((stream) => {
        let video = this.videoRef.current;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  getCaption(imageAsBase64) {
    axios({
      method: 'post',
      url: `${serverEndpoint}/caption/get?file=${encodeURIComponent(imageAsBase64)}`,
    }).then((response) => {
      console.log(this.props.speak({ text: response.data.caption }))
      this.setState({ caption: response.data.caption }, () => {
        wait = false

        // chỗ ngày không cần ở đây, ý là khi có action quẹt trái thì sẽ set photoScreen = false và caption = empty
        // this.setState({ photoScreen: false })
        // this.setState({ photoScreen: false, caption: "" })
      })
    }).catch(err => {
      console.log(JSON.stringify(err))
    });
  }

  takePicture() {
    const width = 640
    const height = 480
    let video = this.videoRef.current
    if (video === null) {
      return
    }
    let photo = this.photoRef.current
    photo.width = width
    photo.height = height
    let ctx = photo.getContext('2d')
    ctx.drawImage(video, 0, 0, width, height)
    let base64String = photo.toDataURL('image/jpeg')
    let data = base64String.substring(base64String.indexOf(',') + 1)
    this.setState({ image: data })
    this.getCaption(data)
  }

  downloadImage() {
    const linkSource = `data:image/png;base64,${this.state.image}`;
    const downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = linkSource;
    downloadLink.target = '_self';
    downloadLink.download = "image.png";
    downloadLink.click();
  }

  stopRecording() {
    this.state.recorder.stop()
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h2>
            Visually Impared Camera
          </h2>
          <video className="container" ref={this.videoRef} style={!this.state.photoScreen ? {} : { display: 'none' }}></video>
          <canvas className="container" ref={this.photoRef} style={this.state.photoScreen ? {} : { display: 'none' }}></canvas>
          <p>{this.state.caption}</p>
        </header>
      </div >
    )
  }
}


const SpeechAPP = () => {
  const { speak } = useSpeechSynthesis();
  return (
    <App speak={speak} />
  )
}
export default SpeechAPP;
