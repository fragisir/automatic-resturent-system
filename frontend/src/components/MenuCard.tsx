import React from 'react';

interface MenuItem {
  _id: string;
  itemNumber: number;
  name: string;
  price: number;
  imageUrl?: string;
  category: string;
}

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, quantity: number) => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd }) => {
  const [quantity, setQuantity] = React.useState(1);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-md mb-2" />
      ) : (
        <div className="w-full h-32 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-black">
          No Image
        </div>
      )}
      <div className="text-lg font-bold">#{item.itemNumber} {item.name}</div>
      <div className="text-black">¥{item.price}</div>
      
      <div className="flex items-center mt-3 space-x-2">
        <button 
          className="bg-gray-200 px-2 py-1 rounded"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
        >
          -
        </button>
        <span>{quantity}</span>
        <button 
          className="bg-gray-200 px-2 py-1 rounded"
          onClick={() => setQuantity(quantity + 1)}
        >
          +
        </button>
      </div>

      <button 
        className="mt-3 bg-green-500 text-white px-4 py-2 rounded-full w-full hover:bg-green-600 transition"
        onClick={() => onAdd(item, quantity)}
      >
        Add to Order
      </button>
    </div>
  );
};

export default MenuCard;
