import { defaultValue } from './defaultValue';
import { defined } from './defined';

let nextCreditId = 0;
const creditToId = {};

class Credit {
    _id: any;
    _html: string;
    _showOnScreen: boolean;
    _element?: any;
    constructor (html: string, showOnScreen = false) {
        let id;
        const key = html;

        if (defined(creditToId[key])) {
            id = creditToId[key];
        } else {
            id = nextCreditId++;
            creditToId[key] = id;
        }

        showOnScreen = defaultValue(showOnScreen, false);

        // Credits are immutable so generate an id to use to optimize equal()
        this._id = id;
        this._html = html;
        this._showOnScreen = showOnScreen;
        this._element = undefined;
    }
}

export { Credit };
