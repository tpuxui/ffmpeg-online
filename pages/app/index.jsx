import { Spin, Upload, Input, Button, message, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { InboxOutlined } from "@ant-design/icons";
import { fileTypeFromBuffer } from "file-type";
import { Analytics } from "@vercel/analytics/react";
import numerify from "numerify/lib/index.cjs";
import qs from "query-string";
import JSZip from "jszip";

const { Dragger } = Upload;
const { Option, OptGroup } = Select;

const commandTemplates = {
  'default': {
      title: 'Lệnh mặc định',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
          { text: '', desc: 'Tùy chọn', copyable: true },
          { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
      ]
  },
  'img_to_webp': {
      title: 'Chuyển đổi PNG/JPG sang WebP',
      category: 'Ảnh',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'image.png', desc: 'File đầu vào', copyable: false },
          { text: '', desc: 'Tùy chọn', copyable: true },
          { text: 'output.webp', desc: 'File đầu ra', copyable: false }
      ]
  },
  'vid_compress_h264_medium': {
      title: 'Nén MP4 Vừa (H.264)',
      category: 'Video',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
          { text: '-c:v libx264 -crf 28 -preset medium -movflags +faststart -c:a aac -b:a 128k', desc: 'Tùy chọn', copyable: true },
          { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
      ]
  },
  'vid_compress_h264_max': {
      title: 'Nén MP4 Tối đa (Web)',
      category: 'Video',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
          { text: '-c:v libx264 -crf 30 -preset medium -movflags +faststart -c:a aac -b:a 128k', desc: 'Tùy chọn', copyable: true },
          { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
      ]
  },
  'vid_to_gif': {
      title: 'Tạo GIF chất lượng cao',
      category: 'Video',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
          { text: '-vf "fps=10,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"', desc: 'Tùy chọn', copyable: true },
          { text: 'output.gif', desc: 'File đầu ra', copyable: false }
      ]
  },
  'vid_compress_h265': {
      title: 'Nén MP4 Vừa (H.265)',
      category: 'Video',
      command: [
          { text: '-i', desc: 'Lệnh mặc định', copyable: false },
          { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
          { text: '-vcodec libx265 -acodec aac -crf 28', desc: 'Tùy chọn', copyable: true },
          { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
      ],
      warning: 'Lưu ý: Video dùng codec H.265 (libx265) sẽ không chạy được trên hầu hết các trình duyệt web (như Chrome, Firefox) và sẽ gây ra lỗi màn hình đen.'
  }
};

const App = () => {
  const [spinning, setSpinning] = useState(false);
  const [tip, setTip] = useState(false);
  const [inputOptions, setInputOptions] = useState("-i");
  const [outputOptions, setOutputOptions] = useState("");
  const [files, setFiles] = useState("");
  const [outputFiles, setOutputFiles] = useState([]);
  const [href, setHref] = useState("");
  const [file, setFile] = useState();
  const [fileList, setFileList] = useState([]);
  const [name, setName] = useState("input.mp4");
  const [output, setOutput] = useState("output.mp4");
  const [downloadFileName, setDownloadFileName] = useState("output.mp4");
  const [selectedCommandKey, setSelectedCommandKey] = useState('default');
  const ffmpeg = useRef();
  const currentFSls = useRef([]);
  const [isDarkMode, setIsDarkMode] = useState(false); // New state for dark mode

  const handleExec = async () => {
    if (!file) {
      return;
    }
    setOutputFiles([]);
    setHref("");
    setDownloadFileName("");
    try {
      setTip("Đang tải tệp vào trình duyệt");
      setSpinning(true);
      for (const fileItem of fileList) {
        ffmpeg.current.FS(
          "writeFile",
          fileItem.name,
          await fetchFile(fileItem)
        );
      }
      currentFSls.current = ffmpeg.current.FS("readdir", ".");
      setTip("Đang bắt đầu thực thi lệnh");
      await ffmpeg.current.run(
        ...inputOptions.split(" "),
        name,
        ...outputOptions.split(" "),
        output
      );
      setSpinning(false);
      const FSls = ffmpeg.current.FS("readdir", ".");
      const outputFiles = FSls.filter((i) => !currentFSls.current.includes(i));
      if (outputFiles.length === 1) {
        const data = ffmpeg.current.FS("readFile", outputFiles[0]);
        const type = await fileTypeFromBuffer(data.buffer);

        const objectURL = URL.createObjectURL(
          new Blob([data.buffer], { type: type.mime })
        );
        setHref(objectURL);
        setDownloadFileName(outputFiles[0]);
        message.success(
          "Chạy thành công, nhấp vào nút tải xuống để tải tệp đầu ra",
          10
        );
      } else if (outputFiles.length > 1) {
        var zip = new JSZip();
        outputFiles.forEach((filleName) => {
          const data = ffmpeg.current.FS("readFile", filleName);
          zip.file(filleName, data);
        });
        const zipFile = await zip.generateAsync({ type: "blob" });
        const objectURL = URL.createObjectURL(zipFile);
        setHref(objectURL);
        setDownloadFileName("output.zip");
        message.success(
          "Chạy thành công, nhấp vào nút tải xuống để tải tệp đầu ra",
          10
        );
      } else {
        message.success(
          "Chạy thành công, không có tệp nào được tạo. Nếu bạn muốn xem đầu ra của lệnh ffmpeg, vui lòng mở bảng điều khiển",
          10
        );
      }
    } catch (err) {
      console.error(err);
      message.error(
        "Chạy thất bại, vui lòng kiểm tra lại lệnh hoặc mở bảng điều khiển để xem chi tiết lỗi",
        10
      );
    }
  };

  const handleGetFiles = async () => {
    if (!files) {
      return;
    }
    const filenames = files
      .split(",")
      .filter((i) => i)
      .map((i) => i.trim());
    const outputFilesData = [];
    for (let filename of filenames) {
      try {
        const data = ffmpeg.current.FS("readFile", filename);
        const type = await fileTypeFromBuffer(data.buffer);

        const objectURL = URL.createObjectURL(
          new Blob([data.buffer], { type: type.mime })
        );
        outputFilesData.push({
          name: filename,
          href: objectURL,
        });
      } catch (err) {
        message.error(`${filename} lấy thất bại`);
        console.error(err);
      }
    }
    setOutputFiles(outputFilesData);
  };

  useEffect(() => {
    (async () => {
      ffmpeg.current = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      });
      ffmpeg.current.setProgress(({ ratio }) => {
        console.log(ratio);
        setTip(numerify(ratio, "0.0%"));
      });
      setTip("Đang tải tài nguyên tĩnh ffmpeg...");
      setSpinning(true);
      await ffmpeg.current.load();
      setSpinning(false);
    })();
  }, []);

  useEffect(() => {
    const { inputOptions, outputOptions, output } = qs.parse(
      window.location.search
    );
    if (inputOptions) {
      setInputOptions(inputOptions);
    }
    if (outputOptions) {
      setOutputOptions(outputOptions);
    }
    if (output) {
      setOutput(output);
    }
  }, []);

  useEffect(() => {
    // run after inputOptions and outputOptions set from querystring
    setTimeout(() => {
      let queryString = qs.stringify({ inputOptions, outputOptions, output });
      const newUrl = `${location.origin}${location.pathname}?${queryString}`;
      history.pushState("", "", newUrl);
    });
  }, [inputOptions, outputOptions, output]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Cleanup function to remove the class when component unmounts or dark mode changes
    return () => {
      document.body.classList.remove('dark-mode');
    };
  }, [isDarkMode]);

  return (
    <div className={`page-app ${isDarkMode ? 'dark-mode' : ''}`}>
      {spinning && (
        <Spin spinning={spinning} tip={tip}>
          <div className="component-spin" />
        </Spin>
      )}

      <h2 align="center">ffmpeg-online</h2>
      <Button
        onClick={() => setIsDarkMode(!isDarkMode)}
        style={{ position: 'absolute', top: 20, right: 20 }}
      >
        {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
      </Button>

      <h4>1. Chọn tệp</h4>
      <p style={{ color: "gray" }}>
        Tệp của bạn sẽ không được tải lên máy chủ, mà chỉ được xử lý trong trình duyệt
      </p>
      <Dragger
        multiple
        beforeUpload={(file, fileList) => {
          setFile(file);
          setFileList((v) => [...v, ...fileList]);
          setName(file.name);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Nhấp hoặc kéo tệp vào đây</p>
      </Dragger>
      <h4>2. Đặt tùy chọn ffmpeg</h4>
      <Select
        value={selectedCommandKey}
        style={{ width: '100%', marginBottom: '10px' }}
        onChange={(value) => {
          setSelectedCommandKey(value);
          const template = commandTemplates[value];
          if (template) {
            const inputPart = template.command[0];
            const outputOptionsPart = template.command[2];
            const outputPart = template.command[3];

            setInputOptions(inputPart.text);
            setOutputOptions(outputOptionsPart.text);
            setOutput(outputPart.text);

            // Update input filename based on category
            if (template.category === 'Ảnh') {
              setName('image.png');
            } else if (template.category === 'Video') {
              setName('input.mp4');
            } else {
              setName('input.mp4'); // Default
            }
          }
        }}
      >
        <OptGroup label="Lệnh Video">
          {Object.entries(commandTemplates)
            .filter(([, template]) => template.category === 'Video')
            .map(([key, template]) => (
              <Option key={key} value={key}>
                {template.title}
              </Option>
            ))}
        </OptGroup>
        <OptGroup label="Lệnh Ảnh">
          {Object.entries(commandTemplates)
            .filter(([, template]) => template.category === 'Ảnh')
            .map(([key, template]) => (
              <Option key={key} value={key}>
                {template.title}
              </Option>
            ))}
        </OptGroup>
        <Option key="default" value="default">
          {commandTemplates.default.title}
        </Option>
      </Select>
      <div className="exec">
        ffmpeg
        <Input
          value={inputOptions}
          placeholder="vui lòng nhập tùy chọn đầu vào"
          readOnly
        />
        <Input
          value={name}
          placeholder="vui lòng nhập tên tệp đầu vào"
          readOnly
        />
        <Input
          value={outputOptions}
          placeholder="vui lòng nhập tùy chọn đầu ra"
          readOnly
        />
        <Input
          value={output}
          placeholder="Vui lòng nhập tên tệp tải xuống"
          onChange={(event) => setOutput(event.target.value)}
        />
        <div className="command-text">
          ffmpeg {inputOptions} {name} {outputOptions} {output}
        </div>
      </div>
      <h4>3. Chạy và lấy tệp đầu ra</h4>
      <Button type="primary" disabled={!Boolean(file)} onClick={handleExec}>
        Chạy
      </Button>
      <br />
      <br />
      {href && (
        <a href={href} download={downloadFileName}>
          tải tệp xuống
        </a>
      )}
      <h4>4. Lấy tệp khác từ hệ thống tệp (sử dụng dấu phẩy để phân tách)</h4>
      <p style={{ color: "gray" }}>
        Trong một số trường hợp, tệp đầu ra chứa nhiều tệp. Lúc này, nhiều tên tệp có thể được phân tách bằng dấu phẩy và nhập vào ô bên dưới.
      </p>
      <Input
        value={files}
        placeholder="Vui lòng nhập tên tệp tải xuống"
        onChange={(event) => setFiles(event.target.value)}
      />
      <Button type="primary" disabled={!Boolean(file)} onClick={handleGetFiles}>
        Xác nhận
      </Button>
      <br />
      <br />
      {outputFiles.map((outputFile, index) => (
        <div key={index}>
          <a href={outputFile.href} download={outputFile.name}>
            {outputFile.name}
          </a>
          <br />
        </div>
      ))}
      <br />
      <br />
      <Analytics />
    </div>
  );
};

export default App;

