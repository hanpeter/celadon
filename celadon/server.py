import os
import psycopg
from datetime import timedelta
from flask import Flask, request, jsonify, send_from_directory
from psycopg_pool import ConnectionPool
from pydantic import ValidationError
from werkzeug.exceptions import BadRequest, HTTPException
from celadon.db import Database
from celadon.application import Application
from celadon.auth import auth_bp, init_oauth, require_login
from celadon.models import Customer, Item, Purchase, Purchaser, Sale
from celadon.sessions import PostgresSessionInterface


def _create_pool():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise EnvironmentError('DATABASE_URL environment variable is not set')
    try:
        return ConnectionPool(
            conninfo=database_url,
            min_size=1,
            max_size=10,
            check=ConnectionPool.check_connection,
        )
    except psycopg.Error as e:
        raise RuntimeError(f'Failed to connect to database: {e}') from e


def create_server(pool=None, database=None, application=None):
    if database is None:
        if pool is None:
            pool = _create_pool()
        database = Database(pool)
    if application is None:
        application = Application(database)

    flask_server = Flask(__name__, static_folder='static', static_url_path='')
    flask_server.config['PERMANENT_SESSION_LIFETIME'] = timedelta(
        seconds=int(os.environ.get('FLASK_SESSION_LIFETIME_SECONDS', 28800))
    )
    flask_server.session_interface = PostgresSessionInterface(database)
    flask_server.app = application

    flask_server.register_blueprint(auth_bp)
    init_oauth(flask_server)

    return flask_server


server = create_server()


@server.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({'error': str(e.description)}), e.code


@server.errorhandler(ValidationError)
def handle_validation_error(e):
    return jsonify({'error': e.errors()}), 422


def get_request_json():
    body = request.get_json(force=True, silent=True)
    if body is None:
        raise BadRequest('Request body must be valid JSON')
    return body


@server.route('/')
@require_login
def index():
    return send_from_directory(server.static_folder, 'index.html')


@server.route('/purchaser', methods=['GET', 'POST'])
@server.route('/purchaser/<int:purchaser_id>', methods=['GET', 'PUT'])
@require_login
def purchaser(purchaser_id=None):
    if purchaser_id is None:
        if request.method == 'POST':
            model = Purchaser.model_validate(get_request_json())
            return jsonify(server.app.add_purchaser(model).model_dump(mode='json')), 201
        else:
            return jsonify([p.model_dump(mode='json') for p in server.app.get_purchasers()])
    else:
        if request.method == 'PUT':
            model = Purchaser.model_validate({**get_request_json(), 'id': purchaser_id})
            return jsonify(server.app.update_purchaser(model).model_dump(mode='json'))
        else:
            return jsonify(server.app.get_purchaser(purchaser_id).model_dump(mode='json'))


@server.route('/purchase', methods=['GET', 'POST'])
@server.route('/purchase/<int:purchase_id>', methods=['GET', 'PUT'])
@require_login
def purchase(purchase_id=None):
    if purchase_id is None:
        if request.method == 'POST':
            model = Purchase.model_validate(get_request_json())
            return jsonify(server.app.add_purchase(model).model_dump(mode='json')), 201
        else:
            return jsonify([p.model_dump(mode='json') for p in server.app.get_purchases()])
    else:
        if request.method == 'PUT':
            model = Purchase.model_validate({**get_request_json(), 'id': purchase_id})
            return jsonify(server.app.update_purchase(model).model_dump(mode='json'))
        else:
            return jsonify(server.app.get_purchase(purchase_id).model_dump(mode='json'))


@server.route('/customer', methods=['GET', 'POST'])
@server.route('/customer/<int:customer_id>', methods=['GET', 'PUT'])
@require_login
def customer(customer_id=None):
    if customer_id is None:
        if request.method == 'POST':
            model = Customer.model_validate(get_request_json())
            return jsonify(server.app.add_customer(model).model_dump(mode='json')), 201
        else:
            return jsonify([c.model_dump(mode='json') for c in server.app.get_customers()])
    else:
        if request.method == 'PUT':
            model = Customer.model_validate({**get_request_json(), 'id': customer_id})
            return jsonify(server.app.update_customer(model).model_dump(mode='json'))
        else:
            return jsonify(server.app.get_customer(customer_id).model_dump(mode='json'))


@server.route('/sale', methods=['GET', 'POST'])
@server.route('/sale/<int:sale_id>', methods=['GET', 'PUT', 'DELETE'])
@require_login
def sale(sale_id=None):
    if sale_id is None:
        if request.method == 'POST':
            model = Sale.model_validate(get_request_json())
            return jsonify(server.app.add_sale(model).model_dump(mode='json')), 201
        else:
            return jsonify([s.model_dump(mode='json') for s in server.app.get_sales()])
    else:
        if request.method == 'PUT':
            model = Sale.model_validate({**get_request_json(), 'id': sale_id})
            return jsonify(server.app.update_sale(model).model_dump(mode='json'))
        elif request.method == 'DELETE':
            server.app.delete_sale(sale_id)
            return '', 204
        else:
            return jsonify(server.app.get_sale(sale_id).model_dump(mode='json'))


@server.route('/item', methods=['GET'])
@server.route('/item/<int:item_id>', methods=['GET', 'PUT'])
@require_login
def item(item_id=None):
    if item_id is None:
        return jsonify([i.model_dump(mode='json') for i in server.app.get_items()])
    else:
        if request.method == 'PUT':
            model = Item.model_validate({**get_request_json(), 'id': item_id})
            return jsonify(server.app.update_item(model).model_dump(mode='json'))
        else:
            return jsonify(server.app.get_item(item_id).model_dump(mode='json'))
