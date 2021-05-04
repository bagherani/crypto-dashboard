class Home extends React.Component {
  socket;
  pairs;

  constructor() {
    super();
    this.state = {
      items: [],
      sortField: "",
      sortDir: false,
      filter: { symbolType: "USDT", deal24GT: 5e4, deal1GT: 0, deal2GT: 0 },
    };

    this.pairs = ["USDT", "BCH", "ETH", "BTC"];

    this.socket = io.connect("http://localhost:3004", {
      reconnection: true,
    });

    this.socket.on("connect", () => {
      console.log("connected to localhost:3004");
      this.socket.on("data", (data) => {
        var items = [...this.state.items];

        Object.keys(data).forEach((symbol) => {
          var entry = items.find((x) => x.symbol == symbol);
          if (entry) {
            Object.keys(data[symbol]).forEach((key) => {
              entry[key] = data[symbol][key];
            });
          }
        });

        this.setState({ items });
      });
    });

    axios.get("/api/symbols").then((res) => {
      var result = res.data;

      var items = [];
      result.data.forEach((symbol) => {
        items.push({ symbol });
      });

      this.setState({ items });

      this.handleSort("symbol");
    });

    this.handleChange = this.handleChange.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  formatNumber(num) {
    if (isNaN(num)) return "";

    if (num > 1e9) return parseInt(num / 1e9).toLocaleString() + "B";
    if (num > 1e6) return parseInt(num / 1e6).toLocaleString() + "M";
    if (num > 1e3) return parseInt(num / 1e3).toLocaleString() + "K";
    if (num < 1) return num.toString();
    return parseInt(num).toLocaleString();
  }

  formatSymbol(value) {
    if (value == undefined) return null;

    var main = value;
    var secondary = value;

    var found = false;
    this.pairs.forEach((pair) => {
      if (!found) {
        if (value.endsWith(pair)) {
          main = value.replace(pair, "");
          secondary = pair;
          found = true;
        }
      }
    });

    return (
      <span className="symbol-name">
        {main}
        <span>&nbsp;/&nbsp;{secondary}</span>
      </span>
    );
  }

  handleChange(e) {
    var filter = { ...this.state.filter };
    filter[e.target.name] = e.target.value;
    this.setState({ filter });
  }

  handleSort(col) {
    var asc = this.state.sortDir;

    if (this.state.sortField == col) {
      asc = !asc;
      this.setState({ sortDir: asc });
    } else this.setState({ sortField: col });

    var items = [...this.state.items];

    items = items.sort((a, b) => {
      if (col == "symbol") {
        if (asc) return a[col] > b[col] ? -1 : 1;
        else return a[col] > b[col] ? 1 : -1;
      } else {
        if (!asc) return +a[col] - +b[col];
        else return +b[col] - +a[col];
      }
    });

    this.setState({ items });
  }

  filter(row) {
    switch (this.state.filter.symbolType) {
      case "USDT":
        if (!row.symbol.endsWith("USDT")) return false;
        break;

      case "BCH":
        if (!row.symbol.endsWith("BCH")) return false;
        break;

      case "ETH":
        if (!row.symbol.endsWith("ETH")) return false;
        break;

      case "BTC":
        if (!row.symbol.endsWith("BTC")) return false;
        break;

      default:
        break;
    }

    if (+row.deal86400 < +this.state.filter.deal24GT) return false;
    if (+row.deal7200 < +this.state.filter.deal2GT) return false;
    if (+row.deal3600 < +this.state.filter.deal1GT) return false;

    return true;
  }

  getCols() {
    const cols = [
      ["symbol", "symbol"],
      
      ["buys", "buys"],
      ["buysCount", "buys count"],
      ["sells", "sells"],
      ["sellsCount", "sells count"],

      ["last86400", "last 24"],
      ["volume86400", "vol 24"],
      ["deal86400", "deals 24"],
      ["last7200", "last 2H"],
      ["volume7200", "vol 2H"],
      ["deal7200", "deal 2H"],

      ["last3600", "last 1H"],
      ["volume3600", "vol 1H"],
      ["deal3600", "deal 1H"],

      ["last1200", "last 30Min"],
      ["volume1200", "vol 30Min"],
      ["deal1200", "deal 30Min"],

      ["last900", "last 15Min"],
      ["volume900", "vol 15Min"],
      ["deal900", "deal 15Min"],
    ];

    return cols.map((col) => (
      <th key={col[0]} onClick={(e) => this.handleSort(col[0])}>
        {col[1]}
        {this.state.sortField == col[0] ? (
          <i
            className={this.state.sortDir ? "fa fa-sort-down" : "fa fa-sort-up"}
          ></i>
        ) : null}
      </th>
    ));
  }

  render() {
    return (
      <div>
        <div className="row">
          <div className="col-md-1">
            Symbol:
            <select
              className="form-control"
              name="symbolType"
              value={this.state.filter.symbolType}
              onChange={this.handleChange}
            >
              <option value="ALL">ALL</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BCH">BCH</option>
            </select>
          </div>
          <div className="col-md-1">
            24H deals &gt;
            <input
              type="number"
              className="form-control"
              name="deal24GT"
              onChange={this.handleChange}
              value={this.state.filter.deal24GT}
            />
          </div>
          <div className="col-md-1">
            2H deals &gt;
            <input
              type="number"
              className="form-control"
              name="deal2GT"
              onChange={this.handleChange}
              value={this.state.filter.deal2GT}
            />
          </div>
          <div className="col-md-1">
            1H deals &gt;
            <input
              type="number"
              className="form-control"
              name="deal1GT"
              onChange={this.handleChange}
              value={this.state.filter.deal1GT}
            />
          </div>
        </div>
        <div className="mt-3">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>#</th>
                {this.getCols()}
              </tr>
            </thead>
            <tbody>
              {this.state.items.length == 0
                ? null
                : this.state.items
                    .filter((x) => {
                      return this.filter(x);
                    })
                    .map((x, $index) => (
                      <tr key={x.symbol}>
                        <td>{$index + 1}</td>
                        <td className="text-nowrap">
                          {this.formatSymbol(x.symbol)}
                        </td>

                        <td>{this.formatNumber(x.buys)}</td>
                        <td>{this.formatNumber(x.buysCount)}</td>
                        <td>{this.formatNumber(x.sells)}</td>
                        <td>{this.formatNumber(x.sellsCount)}</td>

                        <td>{this.formatNumber(x.last86400)}</td>
                        <td>{this.formatNumber(x.volume86400)}</td>
                        <td>{this.formatNumber(x.deal86400)}</td>

                        <td className="bg-light">{x.last7200}</td>
                        <td className="bg-light">
                          {this.formatNumber(x.volume7200)}
                        </td>
                        <td className="bg-light">
                          {this.formatNumber(x.deal7200)}
                        </td>

                        <td>{x.last3600}</td>
                        <td>{this.formatNumber(x.volume3600)}</td>
                        <td>{this.formatNumber(x.deal3600)}</td>

                        <td className="bg-light">{x.last1200}</td>
                        <td className="bg-light">
                          {this.formatNumber(x.volume1200)}
                        </td>
                        <td className="bg-light">
                          {this.formatNumber(x.deal1200)}
                        </td>

                        <td>{x.last900}</td>
                        <td>{this.formatNumber(x.volume900)}</td>
                        <td>{this.formatNumber(x.deal900)}</td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Home />, document.getElementById("app"));
