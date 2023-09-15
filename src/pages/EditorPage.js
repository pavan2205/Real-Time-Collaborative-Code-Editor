import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/client";
import Editor from "../components/Editor";
import axios from "axios";
import { AiOutlineClose } from "react-icons/ai";
import { initSocket } from "../socket";
import Draggable, { DraggableCore } from "react-draggable"; // Both at the same time
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  var languages = [
    {
      name: "cpp",
      ext: "cpp",
    },
    {
      name: "c",
      ext: "c",
    },
    {
      name: "java",
      ext: "java",
    },
    {
      name: "python",
      ext: "py",
    },
    {
      name: "javascript",
      ext: "js",
    },
  ];
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [terminal, showTerminal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [inputs, setInputs] = useState("");

  const handleLanguageChange = (e) => {
    const selectedValue = e.target.value;
    const selectedLanguageObj = languages.find(
      (language) => language.name === selectedValue
    );
    setSelectedLanguage(selectedLanguageObj);
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state.username,
      });

      // Listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
    };
    init();
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []);

  const run = () => {
    runCode(codeRef.current, inputs);
  };

  const runCode = async (code, inputs) => {
    showTerminal(true);
    const options = {
      method: "POST",
      url: "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": "a4379c0b9amshf816dc1a6f08445p152acfjsnc9e3e1fcbbe8",
        "X-RapidAPI-Host": "onecompiler-apis.p.rapidapi.com",
      },
      data: {
        language: selectedLanguage.name,
        stdin: inputs,
        files: [
          {
            name: `index.${selectedLanguage.ext}`,
            content: code,
          },
        ],
      },
    };

    try {
      const response = await axios.request(options);
      if (response.data.stdout === "") {
        setOutput(response.data.stderr);
      } else {
        setOutput(response.data.stdout);
      }
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        <div className="header">
          <div className="language">
            <select
              id="languages"
              onChange={handleLanguageChange}
              value={selectedLanguage.name}
            >
              {languages.map((language) => (
                <option
                  className="languageOption"
                  key={language.name}
                  value={language.name}
                >
                  {language.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={run} class="button" id="button">
            Run
          </button>
        </div>
        <Editor
          className="editor"
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />
        {terminal && (
          <div className="outputConsole">
            <AiOutlineClose
              onClick={() => showTerminal(false)}
              className="closeBtn"
              style={{ color: "red" }}
            />
            <p>{output}</p>
          </div>
        )}
      </div>

      <div className="input">
        {/* <AiOutlineClose
          onClick={() => showTerminal(false)}
          className="closeBtn"
          style={{ color: "red" }}
        /> */}
        <h2>Input</h2>
        <textarea
          className="inputText"
          onChange={(e) => setInputs(e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

export default EditorPage;
