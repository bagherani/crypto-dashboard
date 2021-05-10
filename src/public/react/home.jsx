class Home extends React.Component {
  socket;
  pairs;

  constructor() {
    super();
    this.state = {
      items: [],
      sortField: "",
      sortDir: false,
      filter: {
        symbolType: "USDT",
        symbol: "",
        deal24GT: 5e4,
        deal1GT: 0,
        deal2GT: 0,
      },
    };

    this.pairs = ["USDT", "BCH", "ETH", "BTC"];

    this.socket = io.connect(window.location.origin.replace("3003", "3004"), {
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

        items.forEach((item) => {
          var m15 = +item.deal900 - +item.deal300;
          var m30 = +item.deal1800 - +item.deal900;
          var h1 = +item.deal3600 - +item.deal1800;
          var h2 = +item.deal7200 - +item.deal3600;
          var h24 = +item.deal86400 - +item.deal3600;
          var h24_m5 = +item.deal86400 - +item.deal300;

          item.star = [];

          item.buyersPower = (
            +item.buys /
            +item.buysCount /
            (+item.sells / +item.sellsCount)
          ).toFixed(2);
          item.sellersPower = (
            +item.sells /
            +item.sellsCount /
            (+item.buys / +item.buysCount)
          ).toFixed(2);

          // m5 value is GT than 24h value
          item.m5OnFire = 0;
          if (+item.deal300 > h24_m5) item.m5OnFire = 1;

          if (+item.deal300 > m15 * 2) item.star.push("m5-ok2");
          else if (+item.deal300 > m15) item.star.push("m5-ok");
          else item.star.push("m5-x");

          if (+item.deal900 > m30 * 2) item.star.push("m15-ok2");
          else if (+item.deal900 > m30) item.star.push("m15-ok");
          else item.star.push("m15-x");

          if (+item.deal1800 > h1 * 2) item.star.push("m30-ok2");
          else if (+item.deal1800 > h1) item.star.push("m30-ok");
          else item.star.push("m30-x");

          if (+item.deal3600 > h2 * 2) item.star.push("h1-ok2");
          else if (+item.deal3600 > h2) item.star.push("h1-ok");
          else item.star.push("h1-x");

          var mul = 1;
          if (+item.deal3600 > 50e3 && +item.deal3600 < 100e3) mul = 0.8;
          if (+item.deal3600 > 100e3 && +item.deal3600 < 500e3) mul = 0.6;
          if (+item.deal3600 > 500e3 && +item.deal3600 < 1e6) mul = 0.4;
          if (+item.deal3600 > 1e6 && +item.deal3600 < 10e6) mul = 0.3;
          if (+item.deal3600 > 10e6) mul = 0.2;

          if (h24 * mul < +item.deal3600) item.star.push("d1-ok");
          else item.star.push("d1-x");

          ["86400", "7200", "3600", "1800", "900", "300"].forEach(
            (timeframe) => {
              item["change" + timeframe] =
                ((+item["close" + timeframe] - +item["open" + timeframe]) /
                  Math.max(
                    (+item["open" + timeframe], +item["close" + timeframe])
                  )) *
                100;
            }
          );
        });

        this.handleSort(items);
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

    if (num < 1) return num.toString();

    if (num > 1e9) return (num / 1e9).toFixed("1") + "B";
    if (num > 1e6) return (num / 1e6).toFixed("1") + "M";
    if (num > 1e3) return (num / 1e3).toFixed("1") + "K";
    return (+num).toFixed("1");
  }

  formatChange(value) {
    if (!value) return null;

    return (
      <span className={value > 0 ? "text-success" : "text-danger"}>
        {value.toFixed(2)}%
      </span>
    );
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

  handleSort(d) {
    var col = typeof d == "string" ? d : this.state.sortField;
    var asc = this.state.sortDir;

    if (typeof d === "string") {
      if (this.state.sortField == col) {
        asc = !asc;
        this.setState({ sortDir: asc });
      } else this.setState({ sortField: col });
    }

    var items = typeof d === "string" ? [...this.state.items] : d;

    items = items.sort((a, b) => {
      if (col == "symbol") {
        return a[col] > b[col] ? (asc ? -1 : 1) : asc ? 1 : -1;
      } else if (col == "star") {
        return a[col].filter((x) => x.indexOf("-ok") > -1).length -
          b[col].filter((x) => x.indexOf("-ok") > -1).length >
          0
          ? asc
            ? -1
            : 1
          : asc
          ? 1
          : -1;
      } else {
        if (!asc) return (+a[col] || 0) - (+b[col] || 0) > 0 ? 1 : -1;
        else return (+b[col] || 0) - (+a[col] || 0) > 0 ? 1 : -1;
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

    if (this.state.filter.symbol.length > 0)
      if (
        row.symbol
          .toLowerCase()
          .indexOf(this.state.filter.symbol.toLowerCase()) == -1
      )
        return false;

    return true;
  }

  getCols() {
    const cols = [
      ["symbol", "symbol"],

      ["m5OnFire", "golden M5"],
      ["star", "star"],

      ["buys", "buys amount", "group"],
      ["sells", "sells amount", "group"],

      ["buyersPower", "buyers power"],
      ["sellersPower", "sellers power"],

      ["buysCount", "buys count", "group"],
      ["sellsCount", "sells count", "group"],

      ["volume86400", "vol 24H"],
      ["deal86400", "value 24H"],
      ["change86400", "D1"],

      ["volume7200", "vol 2H", "group"],
      ["deal7200", "value 2H", "group"],
      ["change7200", "H2", "group"],

      ["volume3600", "vol 1H"],
      ["deal3600", "value 1H"],
      ["change3600", "H1"],

      ["volume1800", "vol 30Min", "group"],
      ["deal1800", "value 30Min", "group"],
      ["change1800", "30M", "group"],

      ["volume900", "vol 15Min"],
      ["deal900", "value 15Min"],
      ["change900", "15M"],

      ["volume300", "vol 5Min", "group"],
      ["deal300", "value 5Min", "group"],
      ["change300", "5M", "group"],
    ];

    return cols.map((col) => (
      <th
        key={col[0]}
        onClick={(e) => this.handleSort(col[0])}
        className={col.length == 3 ? "group" : ""}
      >
        {col[1]}
        {this.state.sortField == col[0] ? (
          <i
            className={this.state.sortDir ? "fa fa-sort-down" : "fa fa-sort-up"}
          ></i>
        ) : null}
      </th>
    ));
  }

  getStar(x) {
    if (!Array.isArray(x.star) || x.star.length == 0) return null;

    return x.star.map((star, i) => {
      if (star.indexOf("-ok2") > -1)
        return (
          <i key={i} className="text-warning">
            {star.replace("-ok2", "")}
          </i>
        );
      else if (star.indexOf("-ok") > -1)
        return (
          <i
            key={i}
            className={star.indexOf("d1") > -1 ? "text-warning" : "text-danger"}
          >
            {star.replace("-ok", "")}
          </i>
        );
      else
        return (
          <i key={i} className="text-light">
            {star.replace("-x", "")}
          </i>
        );
    });
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
              <option value="ALL" disabled={true}>
                ALL
              </option>
              <option value="USDT">USDT</option>
              <option value="BTC" disabled={true}>
                BTC
              </option>
              <option value="ETH" disabled={true}>
                ETH
              </option>
              <option value="BCH" disabled={true}>
                BCH
              </option>
            </select>
          </div>
          <div className="col-md-2">
            Search symbols
            <input
              type="search"
              className="form-control"
              name="symbol"
              onChange={this.handleChange}
              value={this.state.filter.symbol}
            />
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

                        <td>{x.m5OnFire == 1 ? "M5⭐" : null}</td>
                        <td>{this.getStar(x)}</td>

                        <td
                          className={
                            +x.buys > +x.sells
                              ? "bg-light text-primary"
                              : "bg-light text-danger"
                          }
                        >
                          {this.formatNumber(x.buys)}
                        </td>
                        <td
                          className={
                            +x.buys < +x.sells
                              ? "bg-light text-primary"
                              : "bg-light text-danger"
                          }
                        >
                          {this.formatNumber(x.sells)}
                        </td>

                        <td> {x.buyersPower}</td>
                        <td>{x.sellersPower}</td>

                        <td
                          className={
                            +x.buysCount > +x.sellsCount
                              ? "bg-light text-primary"
                              : "bg-light text-danger"
                          }
                        >
                          {this.formatNumber(x.buysCount)}
                        </td>
                        <td
                          className={
                            +x.buysCount < +x.sellsCount
                              ? "bg-light text-primary"
                              : "bg-light text-danger"
                          }
                        >
                          {this.formatNumber(x.sellsCount)}
                        </td>

                        <td> {this.formatNumber(x.volume86400)}</td>
                        <td>{this.formatNumber(x.deal86400)}</td>
                        <td>{this.formatChange(x.change86400)}</td>

                        <td className="bg-light">
                          {this.formatNumber(x.volume7200)}
                        </td>
                        <td className="bg-light">
                          {this.formatNumber(x.deal7200)}
                        </td>
                        <td className="bg-light">
                          {this.formatChange(x.change7200)}
                        </td>

                        <td>{this.formatNumber(x.volume3600)}</td>
                        <td>{this.formatNumber(x.deal3600)}</td>
                        <td>{this.formatChange(x.change3600)}</td>

                        <td className="bg-light">
                          {this.formatNumber(x.volume1800)}
                        </td>
                        <td className="bg-light">
                          {this.formatNumber(x.deal1800)}
                        </td>
                        <td className="bg-light">
                          {this.formatChange(x.change1800)}
                        </td>

                        <td>{this.formatNumber(x.volume900)}</td>
                        <td>{this.formatNumber(x.deal900)}</td>
                        <td>{this.formatChange(x.change900)}</td>

                        <td className="bg-light">
                          {this.formatNumber(x.volume300)}
                        </td>
                        <td className="bg-light">
                          {this.formatNumber(x.deal300)}
                        </td>
                        <td className="bg-light">
                          {this.formatChange(x.change300)}
                        </td>
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
